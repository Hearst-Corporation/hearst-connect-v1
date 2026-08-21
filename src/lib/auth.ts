import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { fromBackendRole, loginWithBackend, type BackendLoginFailure } from './backend/auth'
import { getSession, SESSION_COOKIE, type Session } from './session'

/**
 * Authentication — delegated to the Hearst Connect backend.
 *
 * This frontend no longer holds any password and no longer compares any:
 * the authority is `POST /api/v1/auth/login`. The returned token is stored
 * in the server session cookie, never anywhere else.
 */

export type AuthResult = { ok: true; session: Session } | { ok: false; error: string; reason: LoginFailure }

/** Failure reasons, as the login screen must handle them. */
export type LoginFailure = BackendLoginFailure | 'missing_fields'

/**
 * User-facing messages.
 *
 * They are honest about what's happening without revealing exploitable
 * technical detail: no raw HTTP status, no response body, no token, no clue
 * that would let one distinguish "unknown email" from "wrong password".
 */
const FAILURE_MESSAGES: Record<LoginFailure, string> = {
  missing_fields: 'Enter your email address and password.',
  invalid_credentials: 'Incorrect email address or password.',
  forbidden: 'This account does not have access to the admin console.',
  rate_limited: 'Too many login attempts. Wait a minute before trying again.',
  unavailable: 'The authentication service is temporarily unreachable. Try again shortly.',
  malformed_response: 'The authentication service returned an unexpected response. Sign-in did not complete.',
  server_error: 'Sign-in failed on the service side. Try again shortly.',
  not_configured: 'No authentication service is configured on this deployment.',
}

export function loginErrorMessage(reason: LoginFailure): string {
  return FAILURE_MESSAGES[reason]
}

/**
 * Verifies an email / password pair against the backend and composes the
 * corresponding server session.
 *
 * The backend role is translated once, here: `admin` → `OWNER` (V1
 * single-owner). An `investor` is explicitly refused — this console is an
 * administration surface, not an investor space.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const result = await loginWithBackend(email, password)

  if (!result.ok) {
    return { ok: false, reason: result.reason, error: FAILURE_MESSAGES[result.reason] }
  }

  const { credentials } = result
  const role = fromBackendRole(credentials.backendRole)
  if (!role) {
    return { ok: false, reason: 'forbidden', error: FAILURE_MESSAGES.forbidden }
  }

  return {
    ok: true,
    session: {
      userId: credentials.userId,
      email: credentials.email,
      // The backend does not return a display name: none is invented — the
      // local part of the email is reused, which does come from the real account.
      name: credentials.email.split('@')[0] || credentials.email,
      role,
      backendToken: credentials.token,
      expiresAt: credentials.expiresAt,
    },
  }
}

/**
 * Guard for application routes: returns the session or redirects to /login.
 * Used by the server layout of `/admin` — the check happens server side,
 * never client side. An expired session is treated as absent.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (session) return session
  // A missing cookie is "sign in required"; a cookie that fails verification
  // is an actual expiry — the login page words each case honestly.
  const store = await cookies()
  const hadCookie = store.get(SESSION_COOKIE)?.value !== undefined
  redirect(hadCookie ? '/login?reason=expired' : '/login?reason=required')
}
