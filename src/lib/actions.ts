'use server'

import { redirect } from 'next/navigation'
import { authenticate } from './auth'
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
