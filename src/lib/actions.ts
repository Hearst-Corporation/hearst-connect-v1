'use server'

import { redirect } from 'next/navigation'
import { authenticate, isDevBypassAllowed } from './auth'
import { endSession, startSession } from './session'

export type LoginState = { error: string | null }

/** Server Action du formulaire de connexion. */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Renseignez votre e-mail et votre mot de passe.' }
  }

  const result = authenticate(email, password)
  if (!result.ok) {
    return { error: result.error }
  }

  await startSession(result.user)
  redirect('/dashboard')
}

/** Server Action de déconnexion. */
export async function logout(): Promise<void> {
  await endSession()
  redirect('/login')
}

/**
 * Raccourci de développement : ouvre une session propriétaire sans mot de passe.
 *
 * Réservé au poste local. La garde est ici, côté serveur — le bouton qui l'appelle
 * n'est qu'un confort : même appelée directement, l'action refuse hors développement.
 * `next build` fige NODE_ENV à 'production', donc rien de tout ceci n'existe sur
 * un déploiement.
 */
export async function devLogin(): Promise<void> {
  if (!isDevBypassAllowed()) {
    throw new Error('Connexion directe indisponible : réservée au développement local.')
  }

  await startSession({
    email: (process.env.ADRIEN_OWNER_EMAIL || 'adrien@hearstcorporation.io').trim().toLowerCase(),
    name: 'Adrien',
    role: 'OWNER',
  })
  redirect('/dashboard')
}
