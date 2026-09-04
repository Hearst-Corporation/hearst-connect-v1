'use server'

import { devQuickLogin } from '@/lib/env'
import { redirect } from 'next/navigation'
import { authenticate, loginErrorMessage } from './auth'
import { endSession, startSession } from './session'

export type LoginState = { error: string | null }

/**
 * Reads a text field from the form. `FormData.get` can return a `File`: it is
 * not stringified (that would give "[object File]", a ghost identifier that
 * would sail through validation) — a non-text field counts as an empty field.
 */
function textField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Authenticates against the backend and seals the result into the session
 * cookie. Shared tail for `login` and `quickLoginOwner`: same handoff from
 * credentials to a live session, whichever way the credentials were sourced.
 */
async function authenticateAndStartSession(email: string, password: string): Promise<LoginState> {
  const result = await authenticate(email, password)
  if (!result.ok) {
    return { error: result.error }
  }

  const started = await startSession(result.session)
  if (!started) {
    // Token already expired on receipt: don't set a stillborn cookie.
    return { error: loginErrorMessage('malformed_response') }
  }

  redirect('/admin')
}

/**
 * Server Action for the login form.
 *
 * Everything happens server side: credentials go to the backend from here,
 * and the received token is sealed into the session cookie. No token is ever
 * returned to the client, whether in the action state or in an error message.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = textField(formData, 'email')
  const password = textField(formData, 'password')

  if (!email || !password) {
    return { error: loginErrorMessage('missing_fields') }
  }

  return authenticateAndStartSession(email, password)
}

/** Server Action for logout. */
export async function logout(): Promise<void> {
  await endSession()
  redirect('/login')
}

/**
 * Quick owner login — LOCAL DEV ONLY.
 *
 * Replays the same flow as `login` (real authentication against the
 * backend), but with credentials read from the server environment: no secret
 * transits through the client, unlike a pre-filled form. Always refuses in
 * production.
 *
 * Deliberately DEV_QUICK_LOGIN_* and not ADRIEN_OWNER_*: the real owner
 * password must never be compared in this repo (guard verified by
 * tests/auth-doctrine.test.ts). This shortcut therefore requires its own
 * dedicated pair for local dev, distinct from the real owner account.
 */
export async function quickLoginOwner(_prevState: LoginState): Promise<LoginState> {
  // Même garde que `devQuickLogin()` : Vercel construit les previews en
  // production, donc `NODE_ENV` seul rejetait aussi les branches de démo. Le
  // refus vaut pour le déploiement de PRODUCTION, pas pour une preview.
  if (process.env.VERCEL_ENV === 'production') {
    return { error: loginErrorMessage('missing_fields') }
  }
  if (process.env.VERCEL_ENV === undefined && process.env.NODE_ENV === 'production') {
    return { error: loginErrorMessage('missing_fields') }
  }

  const credentials = devQuickLogin()
  if (!credentials) {
    return { error: 'DEV_QUICK_LOGIN_EMAIL / DEV_QUICK_LOGIN_PASSWORD missing from .env.local.' }
  }

  return authenticateAndStartSession(credentials.email, credentials.password)
}
