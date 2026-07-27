import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Session serveur — cookie httpOnly signé HMAC-SHA256.
 *
 * Aucun secret n'est écrit dans le code : `AUTH_SECRET` vient de
 * l'environnement (doctrine Hearst §2.1). Le cookie ne contient que
 * l'identité publique de l'utilisateur, jamais son mot de passe.
 */

export const SESSION_COOKIE = 'hearst_session'

/** 7 jours, en secondes. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

export type SessionUser = {
  email: string
  name: string
  role: Role
}

type SessionPayload = SessionUser & {
  /** Expiration, en secondes epoch. */
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

export function createToken(user: SessionUser): string {
  const payload: SessionPayload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
  const data = encode(JSON.stringify(payload))
  return `${data}.${sign(data)}`
}

export function verifyToken(token: string | undefined): SessionUser | null {
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

  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
  if (!payload.email || !payload.name || !payload.role) return null

  return { email: payload.email, name: payload.name, role: payload.role }
}

/** Pose le cookie de session. À n'appeler que depuis une Server Action ou un Route Handler. */
export async function startSession(user: SessionUser): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Session courante, ou `null` si absente / expirée / signature invalide. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
}
