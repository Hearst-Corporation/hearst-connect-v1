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

/**
 * Connexion rapide owner — DEV LOCAL UNIQUEMENT.
 *
 * Rejoue le même flux que `login` (authentification réelle contre le
 * backend), mais avec des identifiants lus depuis l'environnement serveur :
 * aucun secret ne transite par le client, contrairement à un formulaire
 * pré-rempli. Refuse systématiquement en production.
 *
 * Volontairement DEV_QUICK_LOGIN_* et non ADRIEN_OWNER_* : le mot de passe
 * owner réel ne doit jamais être comparé dans ce dépôt (garde-fou vérifié par
 * tests/auth-doctrine.test.ts). Ce raccourci exige donc son propre couple
 * dédié au dev local, distinct du compte owner réel.
 */
export async function quickLoginOwner(_prevState: LoginState): Promise<LoginState> {
  if (process.env.NODE_ENV === 'production') {
    return { error: loginErrorMessage('missing_fields') }
  }

  const email = process.env.DEV_QUICK_LOGIN_EMAIL
  const password = process.env.DEV_QUICK_LOGIN_PASSWORD
  if (!email || !password) {
    return { error: 'DEV_QUICK_LOGIN_EMAIL / DEV_QUICK_LOGIN_PASSWORD absents de .env.local.' }
  }

  const result = await authenticate(email, password)
  if (!result.ok) {
    return { error: result.error }
  }

  const started = await startSession(result.session)
  if (!started) {
    return { error: loginErrorMessage('malformed_response') }
  }

  redirect('/admin')
}
