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
 * `/login/expired` is where the server guard sends an expired session;
 * `/login/required` when there simply was no session. The user deserves to know which, without any technical detail.
 */
export default async function LoginPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ reason?: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  // A valid session has no business on the sign-in screen.
  if (await getSession()) redirect('/admin')

  const legacy = (await searchParams).reason
  if (legacy === 'expired' || legacy === 'required') redirect(`/login/${legacy}`)
  const { reason } = await params
  // Les adresses de comparaison des deux animations : le cube est retenu.
  if (reason === 'cube' || reason === 'miner') redirect('/login')
  const notice =
    reason === 'expired'
      ? 'Your session has expired. Sign in again to access the console.'
      : reason === 'required'
        ? 'Sign in to access the console.'
        : null

  const { loginReady } = checkConfiguration()

  // Owner quick-login button: local dev only, and only if the credentials
  // actually exist in the server environment — we never show the button just
  // to have it fail afterwards for lack of config.
  return (
    <LoginForm notice={notice} loginReady={loginReady} devQuickLoginAvailable={devQuickLoginAvailable()} />
  )
}
