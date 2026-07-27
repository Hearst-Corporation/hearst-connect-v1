'use server'

import { redirect } from 'next/navigation'
import { authenticate, loginErrorMessage } from './auth'
import { endSession, startSession } from './session'

export type LoginState = { error: string | null }

/**
 * Lit un champ texte du formulaire. `FormData.get` peut rendre un `File` : on ne
 * le stringifie pas (ça donnerait « [object File] », donc un identifiant fantôme
 * qui traverserait la validation) — un champ non textuel vaut champ vide.
 */
function textField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Server Action du formulaire de connexion.
 *
 * Tout se passe côté serveur : les identifiants partent vers le backend depuis
 * ici, et le jeton reçu est scellé dans le cookie de session. Aucun jeton n'est
 * renvoyé au client, ni dans l'état de l'action, ni dans un message d'erreur.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = textField(formData, 'email')
  const password = textField(formData, 'password')

  if (!email || !password) {
    return { error: loginErrorMessage('missing_fields') }
  }

  const result = await authenticate(email, password)
  if (!result.ok) {
    return { error: result.error }
  }

  const started = await startSession(result.session)
  if (!started) {
    // Jeton déjà expiré à la réception : on ne pose pas un cookie mort-né.
    return { error: loginErrorMessage('malformed_response') }
  }

  redirect('/admin')
}

/** Server Action de déconnexion. */
export async function logout(): Promise<void> {
  await endSession()
  redirect('/login')
}
