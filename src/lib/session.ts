import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Server session — HMAC-SHA256-signed httpOnly cookie.
 *
 * No secret is written in the code: `AUTH_SECRET` comes from the environment
 * (Hearst doctrine §2.1). The cookie carries the user's identity AND the
 * bearer token issued by the backend — which is why it stays strictly
 * httpOnly: it is never readable in JavaScript, never serialized to a client
 * component, never rendered in the HTML.
 *
 * The cookie's expiration is ALIGNED with the backend token's: a frontend
 * session does not outlive the token it carries.
 */

export const SESSION_COOKIE = 'hearst_session'

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

/**
 * Session identity, safe to pass to a client component.
 * It contains NO token whatsoever.
 */
export type SessionUser = {
  /**
   * Canonical user identifier, as it appears in the backend's authenticated
   * record. An email is NOT an identifier: conflating them would expose one
   * account to another's scope.
   */
  userId: string
  email: string
  name: string
  role: Role
}

/**
 * Full session, server side only.
 * `backendToken` never crosses the server → client boundary.
 */
export type Session = SessionUser & {
  /** Bearer token issued by the backend, RAW value (without "Bearer"). */
  backendToken: string
  /** Expiration of the backend token, in epoch seconds. */
  expiresAt: number
}

type SessionPayload = Session & {
  /** Cookie expiration, in epoch seconds. Equal to `expiresAt`. */
  exp: number
}

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET missing or too short (32 characters minimum). See .env.example.')
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

/** Identity alone — the ONLY form a client component may receive. */
export function publicUser(session: Session): SessionUser {
  return { userId: session.userId, email: session.email, name: session.name, role: session.role }
}

/**
 * Sets the session cookie. Only call from a Server Action or a Route
 * Handler.
 *
 * `maxAge` is computed from the backend token's expiration: the cookie dies
 * with it. An expiration already in the past sets no cookie.
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

/** Current session, or `null` if absent / expired / signature invalid. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
}
