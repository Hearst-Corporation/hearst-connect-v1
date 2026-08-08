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
 * Écran de connexion.
 *
 * `reason=expired` est posé par la garde serveur de `/admin` quand une session
 * absente ou périmée a provoqué une redirection : l'utilisateur mérite de
 * savoir pourquoi il est revenu ici, sans qu'on lui expose de détail technique.
 */
export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  // Une session valide n'a rien à faire sur l'écran de connexion.
  if (await getSession()) redirect('/admin')

  const { reason } = await searchParams
  const notice =
    reason === 'expired' ? 'Your session has expired. Sign in again to access the console.' : null

  const { loginReady } = checkConfiguration()

  // Bouton de connexion rapide owner : dev local uniquement, et seulement si
  // les identifiants existent réellement dans l'environnement serveur — on
  // n'affiche jamais le bouton pour ensuite échouer faute de config.
  return (
    <LoginForm notice={notice} loginReady={loginReady} devQuickLoginAvailable={devQuickLoginAvailable()} />
  )
}
