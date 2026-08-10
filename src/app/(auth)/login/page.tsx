import { checkConfiguration, devQuickLoginAvailable } from '@/lib/env'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export const dynamic = 'force-dynamic'

/**
 * Sign-in screen.
 *
 * `reason=expired` is set by the `/admin` server guard when a missing or
 * expired session triggered a redirect: the user deserves to know why they
 * were sent back here, without exposing any technical detail.
 */
export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  // A valid session has no business on the sign-in screen.
  if (await getSession()) redirect('/admin')

  const { reason } = await searchParams
  const notice =
    reason === 'expired' ? 'Your session has expired. Sign in again to access the console.' : null

  const { loginReady } = checkConfiguration()

  // Owner quick-login button: local dev only, and only if the credentials
  // actually exist in the server environment — we never show the button just
  // to have it fail afterwards for lack of config.
  return (
    <LoginForm notice={notice} loginReady={loginReady} devQuickLoginAvailable={devQuickLoginAvailable()} />
  )
}
