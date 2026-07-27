import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Session serveur — cookie httpOnly signé HMAC-SHA256.
 *
 * Aucun secret n'est écrit dans le code : `AUTH_SECRET` vient de
 * l'environnement (doctrine Hearst §2.1). Le cookie porte l'identité de
 * l'utilisateur ET le jeton porteur émis par le backend — c'est pourquoi il
 * reste strictement httpOnly : il n'est jamais lisible en JavaScript, jamais
 * sérialisé vers un composant client, jamais rendu dans le HTML.
 *
 * L'expiration du cookie est ALIGNÉE sur celle du jeton backend : une session
 * frontend ne survit pas au jeton qu'elle transporte.
 */

export const SESSION_COOKIE = 'hearst_session'

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

/**
 * Identité de session, sûre à passer à un composant client.
 * Elle ne contient AUCUN jeton.
 */
export type SessionUser = {
  /**
   * Identifiant canonique de l'utilisateur, tel qu'il figure dans
   * l'enregistrement authentifié du backend. Un e-mail n'est PAS un
   * identifiant : le confondre exposerait un compte au périmètre d'un autre.
   */
  userId: string
  email: string
  name: string
  role: Role
}

/**
 * Session complète, côté serveur uniquement.
 * `backendToken` ne franchit jamais la frontière serveur → client.
 */
export type Session = SessionUser & {
  /** Jeton porteur émis par le backend, valeur BRUTE (sans « Bearer »). */
  backendToken: string
  /** Expiration du jeton backend, en secondes epoch. */
  expiresAt: number
}

type SessionPayload = Session & {
  /** Expiration du cookie, en secondes epoch. Égale à `expiresAt`. */
  exp: number
}

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.')
  }
  return value
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url')
const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function createToken(session: Session): string {
  const payload: SessionPayload = { ...session, exp: session.expiresAt }
  const data = encode(JSON.stringify(payload))
  return `${data}.${sign(data)}`
}

export function verifyToken(token: string | undefined): Session | null {
  if (!token) return null

  const [data, signature] = token.split('.')
  if (!data || !signature) return null
  if (!safeEqual(signature, sign(data))) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
  if (typeof payload.expiresAt !== 'number' || payload.expiresAt * 1000 <= Date.now()) return null
  if (!payload.userId || !payload.email || !payload.name || !payload.role) return null
  if (typeof payload.backendToken !== 'string' || payload.backendToken.length === 0) return null

  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    backendToken: payload.backendToken,
    expiresAt: payload.expiresAt,
  }
}

/** Identité seule — c'est la SEULE forme qu'un composant client peut recevoir. */
export function publicUser(session: Session): SessionUser {
  return { userId: session.userId, email: session.email, name: session.name, role: session.role }
}

/**
 * Pose le cookie de session. À n'appeler que depuis une Server Action ou un
 * Route Handler.
 *
 * `maxAge` est calculé depuis l'expiration du jeton backend : le cookie meurt
 * avec lui. Une expiration déjà passée ne pose aucun cookie.
 */
export async function startSession(session: Session): Promise<boolean> {
  const maxAge = session.expiresAt - Math.floor(Date.now() / 1000)
  if (maxAge <= 0) return false

  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  })
  return true
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Session courante, ou `null` si absente / expirée / signature invalide. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
}
