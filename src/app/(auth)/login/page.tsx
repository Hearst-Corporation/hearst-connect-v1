import { checkConfiguration } from '@/lib/env'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion',
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
    reason === 'expired' ? 'Votre session a expiré. Connectez-vous à nouveau pour accéder à la console.' : null

  const { loginReady } = checkConfiguration()

  // Bouton de connexion rapide owner : dev local uniquement, et seulement si
  // les identifiants existent réellement dans l'environnement serveur — on
  // n'affiche jamais le bouton pour ensuite échouer faute de config.
  const devQuickLoginAvailable =
    process.env.NODE_ENV !== 'production' &&
    Boolean(process.env.DEV_QUICK_LOGIN_EMAIL) &&
    Boolean(process.env.DEV_QUICK_LOGIN_PASSWORD)

  return <LoginForm notice={notice} loginReady={loginReady} devQuickLoginAvailable={devQuickLoginAvailable} />
}
