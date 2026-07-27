import 'server-only'

import { backendUrl } from '@/lib/env'
import type { Role } from '@/lib/session'

/**
 * Pont d'authentification frontend → backend Hearst Connect.
 *
 * Le backend Railway est désormais l'AUTORITÉ d'authentification : ce frontend
 * ne vérifie plus lui-même un mot de passe et ne frappe plus aucun jeton. Il
 * transmet les identifiants à `POST /api/v1/auth/login`, reçoit un jeton porteur
 * et le range dans la session serveur — jamais ailleurs.
 *
 * `import 'server-only'` fait échouer le build si ce module atteint un bundle
 * client : le jeton backend ne doit jamais quitter le serveur.
 */

/** Rôles reconnus par le backend. */
export type BackendRole = 'investor' | 'admin'

/** Chemin canonique de la route de connexion du backend. */
export const LOGIN_PATH = '/api/v1/auth/login'

/** Délai maximal d'une tentative de connexion, en millisecondes. */
const LOGIN_TIMEOUT_MS = 10_000

/**
 * Rôle backend correspondant au rôle frontend.
 *
 * OWNER et ADMIN deviennent `admin`. MEMBER n'obtient PAS `investor` par
 * défaut : ce frontend est une console d'administration, et un membre n'a
 * aucune raison d'interroger le backend en son nom. Le refus est explicite.
 */
export function toBackendRole(role: Role): BackendRole | null {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'admin'
    case 'MEMBER':
      return null
  }
}

/**
 * Rôle frontend correspondant au rôle backend.
 *
 * V1 single-owner : le backend ne connaît que `admin` et `investor`. `admin`
 * ouvre la console en tant que propriétaire ; `investor` ne l'ouvre PAS — le
 * refus est explicite, jamais une rétrogradation silencieuse en MEMBER qui
 * laisserait croire à une session valide.
 */
export function fromBackendRole(role: BackendRole): Role | null {
  return role === 'admin' ? 'OWNER' : null
}

/**
 * Retire un préfixe « Bearer » éventuellement déjà présent dans la valeur du
 * jeton.
 *
 * Le contrat cible impose une valeur BRUTE, sans préfixe : c'est au frontend de
 * composer `Authorization: Bearer <token>`. Le déploiement Railway courant
 * renvoie encore l'ancien format préfixé ; sans cette normalisation, l'en-tête
 * deviendrait « Bearer Bearer <token> » et toutes les routes protégées
 * répondraient 401. La normalisation est donc défensive et idempotente.
 */
export function normalizeBearerToken(raw: string): string {
  let value = raw.trim()
  // Boucle : « Bearer Bearer x » a déjà été observé côté backend, on ne veut
  // pas d'une normalisation qui n'enlèverait qu'une couche.
  while (/^bearer\s+/i.test(value)) {
    value = value.replace(/^bearer\s+/i, '').trim()
  }
  return value
}

/** En-tête d'autorisation à envoyer au backend, composé sans double préfixe. */
export function authorizationHeader(token: string): string {
  return `Bearer ${normalizeBearerToken(token)}`
}

/** Identité et jeton renvoyés par le backend, une fois normalisés. */
export type BackendCredentials = {
  token: string
  userId: string
  email: string
  backendRole: BackendRole
  /** Expiration du jeton backend, en secondes epoch. */
  expiresAt: number
}

export type BackendLoginFailure =
  | 'not_configured'
  | 'invalid_credentials'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'
  | 'malformed_response'
  | 'server_error'

export type BackendLoginResult =
  | { ok: true; credentials: BackendCredentials }
  | { ok: false; reason: BackendLoginFailure; httpStatus: number | null }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Lit `expiresAt` (ISO 8601) et le convertit en secondes epoch.
 * Une date absente, illisible ou déjà passée n'est pas rattrapée par une durée
 * arbitraire : la réponse est considérée hors contrat.
 */
function readExpiry(source: Record<string, unknown>): number | null {
  const raw = readString(source, 'expiresAt')
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  return Math.floor(parsed / 1000)
}

/**
 * Valide et normalise le corps d'une réponse de connexion.
 *
 * Contrat attendu :
 * `{ token, tokenType, expiresAt, user: { id, email, role } }`.
 * Toute divergence rend `null` : on préfère un échec nommé à une session
 * fabriquée à partir d'une réponse qu'on n'a pas comprise.
 */
export function parseLoginResponse(body: unknown): BackendCredentials | null {
  if (!isRecord(body)) return null

  const rawToken = readString(body, 'token')
  if (!rawToken) return null
  const token = normalizeBearerToken(rawToken)
  if (!token) return null

  const user = body.user
  if (!isRecord(user)) return null

  const userId = readString(user, 'id')
  const email = readString(user, 'email')
  const role = readString(user, 'role')
  if (!userId || !email) return null
  if (role !== 'admin' && role !== 'investor') return null

  const expiresAt = readExpiry(body)
  if (expiresAt === null) return null

  return { token, userId, email: email.toLowerCase(), backendRole: role, expiresAt }
}

/**
 * Soumet un couple e-mail / mot de passe au backend.
 *
 * Aucun repli local : si le backend est injoignable, la connexion échoue. Rien
 * de ce que renvoie le backend n'est journalisé — ni le jeton, ni le corps.
 */
export async function loginWithBackend(email: string, password: string): Promise<BackendLoginResult> {
  const base = backendUrl()
  if (!base) {
    return { ok: false, reason: 'not_configured', httpStatus: null }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${base}${LOGIN_PATH}`, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
  } catch {
    return { ok: false, reason: 'unavailable', httpStatus: null }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const status = response.status
    if (status === 400 || status === 401 || status === 422) {
      return { ok: false, reason: 'invalid_credentials', httpStatus: status }
    }
    if (status === 403) return { ok: false, reason: 'forbidden', httpStatus: status }
    if (status === 429) return { ok: false, reason: 'rate_limited', httpStatus: status }
    if (status >= 500) return { ok: false, reason: 'unavailable', httpStatus: status }
    return { ok: false, reason: 'server_error', httpStatus: status }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, reason: 'malformed_response', httpStatus: response.status }
  }

  const credentials = parseLoginResponse(body)
  if (!credentials) {
    return { ok: false, reason: 'malformed_response', httpStatus: response.status }
  }

  return { ok: true, credentials }
}
