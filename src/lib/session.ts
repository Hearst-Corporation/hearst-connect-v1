import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { authSecret } from '@/lib/env'

/**
 * Server session — AES-256-GCM AUTHENTICATED-ENCRYPTED httpOnly cookie.
 *
 * ── Why encryption, not just a signature (SEC-02) ──────────────────────────
 * The cookie carries the user's identity AND the bearer token issued by the
 * backend. A signed-only cookie keeps that token in plaintext base64: anyone
 * who obtains the cookie value (a log, a backup, a proxy) can read the backend
 * bearer token. So the payload is now ENCRYPTED, not merely signed. AES-GCM is
 * authenticated encryption: its 128-bit tag detects any tampering, which is why
 * it replaces the previous HMAC entirely — a forged or altered token fails
 * decryption and yields `null`.
 *
 * The cookie stays strictly httpOnly regardless: never readable in JavaScript,
 * never serialized to a client component, never rendered in the HTML.
 *
 * ── Key ────────────────────────────────────────────────────────────────────
 * The 256-bit key is derived deterministically from `AUTH_SECRET` (SHA-256).
 * No secret is written in the code (Hearst doctrine §2.1); `AUTH_SECRET` comes
 * from the environment through the single `env.ts` door.
 *
 * ── Rotation ───────────────────────────────────────────────────────────────
 * Tokens are versioned (`v1` prefix). To rotate the key, mint under a new
 * version while `verifyToken` still accepts the previous one for one token
 * lifetime, then drop the old branch. Rotating `AUTH_SECRET` invalidates all
 * live sessions (they fail decryption and are treated as expired) — a safe
 * default, since a session cannot outlive the secret that sealed it.
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

/** Current token format version. Bump alongside a key rotation (see header). */
const TOKEN_VERSION = 'v1'
const IV_BYTES = 12 // 96-bit nonce, the standard size for AES-GCM.

/**
 * 256-bit encryption key, derived from `AUTH_SECRET` by SHA-256.
 *
 * A hash gives a uniform 32-byte key from a secret of any length ≥ 32 chars,
 * deterministically, so the same secret always decrypts its own tokens. It is
 * never logged and never leaves the server.
 */
function key(): Buffer {
  const value = authSecret()
  if (!value) {
    throw new Error('AUTH_SECRET missing or too short (32 characters minimum). See .env.example.')
  }
  return createHash('sha256').update(value).digest()
}

/**
 * Seals a session into a `v1.<iv>.<ciphertext>.<tag>` token, all base64url.
 * AES-256-GCM: the payload is confidential AND tamper-evident. A fresh random
 * IV per token means two identical sessions never produce the same ciphertext.
 */
export function createToken(session: Session): string {
  const payload: SessionPayload = { ...session, exp: session.expiresAt }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    TOKEN_VERSION,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

export function verifyToken(token: string | undefined): Session | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [version, ivRaw, ctRaw, tagRaw] = parts
  if (version !== TOKEN_VERSION) return null

  let payload: SessionPayload
  try {
    const iv = Buffer.from(ivRaw, 'base64url')
    const ciphertext = Buffer.from(ctRaw, 'base64url')
    const tag = Buffer.from(tagRaw, 'base64url')
    if (iv.length !== IV_BYTES || tag.length !== 16) return null
    const decipher = createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    // `final()` throws if the tag does not verify — a tampered or forged token
    // cannot be decrypted, and lands here as `null` rather than a valid session.
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    payload = JSON.parse(plaintext)
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
