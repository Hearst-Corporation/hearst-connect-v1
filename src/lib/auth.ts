import { redirect } from 'next/navigation'
import { fromBackendRole, loginWithBackend, type BackendLoginFailure } from './backend/auth'
import { getSession, type Session } from './session'

/**
 * Authentification — déléguée au backend Hearst Connect.
 *
 * Ce frontend ne détient plus aucun mot de passe et n'en compare plus aucun :
 * l'autorité est `POST /api/v1/auth/login`. Le jeton renvoyé est rangé dans le
 * cookie de session serveur, jamais ailleurs.
 */

export type AuthResult = { ok: true; session: Session } | { ok: false; error: string; reason: LoginFailure }

/** Motifs d'échec, tels que l'écran de connexion doit les traiter. */
export type LoginFailure = BackendLoginFailure | 'missing_fields'

/**
 * Messages destinés à l'utilisateur.
 *
 * Ils sont honnêtes sur ce qui se passe sans révéler de détail technique
 * exploitable : ni statut HTTP brut, ni corps de réponse, ni jeton, ni indice
 * permettant de distinguer « e-mail inconnu » de « mot de passe faux ».
 */
const FAILURE_MESSAGES: Record<LoginFailure, string> = {
  missing_fields: 'Renseignez votre e-mail et votre mot de passe.',
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  forbidden: 'Ce compte n’ouvre pas l’accès à la console d’administration.',
  rate_limited: 'Trop de tentatives de connexion. Patientez une minute avant de réessayer.',
  unavailable: 'Le service d’authentification est momentanément injoignable. Réessayez dans quelques instants.',
  malformed_response: 'Le service d’authentification a répondu de façon inattendue. La connexion n’a pas abouti.',
  server_error: 'La connexion a échoué côté service. Réessayez dans quelques instants.',
  not_configured: 'Aucun service d’authentification n’est configuré sur ce déploiement.',
}

export function loginErrorMessage(reason: LoginFailure): string {
  return FAILURE_MESSAGES[reason]
}

/**
 * Vérifie un couple e-mail / mot de passe auprès du backend et compose la
 * session serveur correspondante.
 *
 * Le rôle backend est traduit une seule fois, ici : `admin` → `OWNER` (V1
 * single-owner). Un `investor` est refusé explicitement — cette console est une
 * surface d'administration, pas un espace investisseur.
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
      // Le backend ne renvoie pas de nom d'affichage : on n'en invente pas, on
      // reprend la partie locale de l'e-mail, qui vient bien du compte réel.
      name: credentials.email.split('@')[0] || credentials.email,
      role,
      backendToken: credentials.token,
      expiresAt: credentials.expiresAt,
    },
  }
}

/**
 * Garde des routes applicatives : renvoie la session ou redirige vers /login.
 * Utilisée par le layout serveur de `/admin` — la vérification est côté
 * serveur, jamais côté client. Une session expirée est traitée comme absente.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login?reason=expired')
  return session
}
