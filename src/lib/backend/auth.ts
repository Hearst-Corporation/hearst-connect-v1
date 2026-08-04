import 'server-only'

import { backendUrl } from '@/lib/env'
import type { Role } from '@/lib/session'

/**
 * Frontend → Hearst Connect backend authentication bridge.
 *
 * The Railway backend is now the authentication AUTHORITY: this frontend no
 * longer verifies a password itself and no longer mints any token. It
 * forwards credentials to `POST /api/v1/auth/login`, receives a bearer
 * token, and stores it in the server session — never anywhere else.
 *
 * `import 'server-only'` fails the build if this module reaches a client
 * bundle: the backend token must never leave the server.
 */

/** Roles recognized by the backend. */
export type BackendRole = 'investor' | 'admin'

/** Canonical path of the backend's login route. */
const LOGIN_PATH = '/api/v1/auth/login'

/** Maximum duration of a login attempt, in milliseconds. */
const LOGIN_TIMEOUT_MS = 10_000

/**
 * Backend role corresponding to the frontend role.
 *
 * OWNER and ADMIN become `admin`. MEMBER does NOT get `investor` by default:
 * this frontend is an administration console, and a member has no reason to
 * query the backend on its behalf. The refusal is explicit.
 */
export function toBackendRole(role: Role): BackendRole | null {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'admin'
    case 'MEMBER':
      return null
  }
}

/**
 * Frontend role corresponding to the backend role.
 *
 * V1 single-owner: the backend only knows `admin` and `investor`. `admin`
 * opens the console as owner; `investor` does NOT open it — the refusal is
 * explicit, never a silent downgrade to MEMBER that would suggest a valid
 * session.
 */
export function fromBackendRole(role: BackendRole): Role | null {
  return role === 'admin' ? 'OWNER' : null
}

/**
 * Strips a "Bearer" prefix possibly already present in the token value.
 *
 * The target contract requires a RAW value, without prefix: it's up to the
 * frontend to compose `Authorization: Bearer <token>`. The current Railway
 * deployment still returns the old prefixed format; without this
 * normalization, the header would become "Bearer Bearer <token>" and every
 * protected route would respond 401. The normalization is therefore
 * defensive and idempotent.
 */
export function normalizeBearerToken(raw: string): string {
  let value = raw.trim()
  // Loop: "Bearer Bearer x" has already been observed backend side; a
  // normalization that only strips one layer is not wanted.
  while (/^bearer\s+/i.test(value)) {
    value = value.replace(/^bearer\s+/i, '').trim()
  }
  return value
}

/** Authorization header to send to the backend, composed without a double prefix. */
export function authorizationHeader(token: string): string {
  return `Bearer ${normalizeBearerToken(token)}`
}

/** Identity and token returned by the backend, once normalized. */
export type BackendCredentials = {
  token: string
  userId: string
  email: string
  backendRole: BackendRole
  /** Expiration du jeton backend, en secondes epoch. */
  expiresAt: number
}

export type BackendLoginFailure =
  | 'not_configured'
  | 'invalid_credentials'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'
  | 'malformed_response'
  | 'server_error'

export type BackendLoginResult =
  | { ok: true; credentials: BackendCredentials }
  | { ok: false; reason: BackendLoginFailure; httpStatus: number | null }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Reads `expiresAt` (ISO 8601) and converts it to epoch seconds.
 * A missing, unreadable, or already-past date is not patched up by an
 * arbitrary duration: the response is considered out of contract.
 */
function readExpiry(source: Record<string, unknown>): number | null {
  const raw = readString(source, 'expiresAt')
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  return Math.floor(parsed / 1000)
}

/**
 * Validates and normalizes the body of a login response.
 *
 * Expected contract:
 * `{ token, tokenType, expiresAt, user: { id, email, role } }`.
 * Any divergence returns `null`: a named failure is preferred over a session
 * built from a response that wasn't understood.
 */
export function parseLoginResponse(body: unknown): BackendCredentials | null {
  if (!isRecord(body)) return null

  const rawToken = readString(body, 'token')
  if (!rawToken) return null
  const token = normalizeBearerToken(rawToken)
  if (!token) return null

  const user = body.user
  if (!isRecord(user)) return null

  const userId = readString(user, 'id')
  const email = readString(user, 'email')
  const role = readString(user, 'role')
  if (!userId || !email) return null
  if (role !== 'admin' && role !== 'investor') return null

  const expiresAt = readExpiry(body)
  if (expiresAt === null) return null

  return { token, userId, email: email.toLowerCase(), backendRole: role, expiresAt }
}

/**
 * Submits an email / password pair to the backend.
 *
 * No local fallback: if the backend is unreachable, the login fails. Nothing
 * the backend returns is ever logged — neither the token nor the body.
 */
export async function loginWithBackend(email: string, password: string): Promise<BackendLoginResult> {
  const base = backendUrl()
  if (!base) {
    return { ok: false, reason: 'not_configured', httpStatus: null }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${base}${LOGIN_PATH}`, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
  } catch {
    return { ok: false, reason: 'unavailable', httpStatus: null }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const status = response.status
    if (status === 400 || status === 401 || status === 422) {
      return { ok: false, reason: 'invalid_credentials', httpStatus: status }
    }
    if (status === 403) return { ok: false, reason: 'forbidden', httpStatus: status }
    if (status === 429) return { ok: false, reason: 'rate_limited', httpStatus: status }
    if (status >= 500) return { ok: false, reason: 'unavailable', httpStatus: status }
    return { ok: false, reason: 'server_error', httpStatus: status }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, reason: 'malformed_response', httpStatus: response.status }
  }

  const credentials = parseLoginResponse(body)
  if (!credentials) {
    return { ok: false, reason: 'malformed_response', httpStatus: response.status }
  }

  return { ok: true, credentials }
}
