import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SessionUser } from '@/lib/session'

/**
 * Pont d'authentification frontend → backend.
 *
 * Le backend n'accepte pas le cookie de session de ce frontend : il attend un
 * jeton court signé HMAC portant `{ userId, role, exp }`, signé avec
 * `SESSION_SIGNING_KEY` — une clé DISTINCTE de `AUTH_SECRET`.
 *
 * `import 'server-only'` fait échouer le build si ce module atteint un bundle
 * client : la clé de signature ne doit jamais quitter le serveur.
 */

/** Rôles reconnus par le backend. */
export type BackendRole = 'investor' | 'admin'

/** Durée de vie volontairement courte : le jeton est frappé par requête. */
const TOKEN_TTL_SECONDS = 120

export type TokenPayload = {
  userId: string
  role: BackendRole
  exp: number
}

export type MintResult =
  | { ok: true; token: string; role: BackendRole }
  | { ok: false; reason: 'not_configured' | 'forbidden' | 'no_canonical_id'; detail: string }

/**
 * Rôle backend correspondant au rôle frontend.
 *
 * OWNER et ADMIN deviennent `admin`. MEMBER n'obtient PAS `investor` par
 * défaut : ce frontend est une console d'administration, et un membre n'a
 * aucune raison d'interroger le backend en son nom. Le refus est explicite.
 */
export function toBackendRole(role: SessionUser['role']): BackendRole | null {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'admin'
    case 'MEMBER':
      return null
  }
}

function signingKey(): string | null {
  const key = process.env.SESSION_SIGNING_KEY?.trim()
  return key && key.length >= 32 ? key : null
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url')
const sign = (data: string, key: string) => createHmac('sha256', key).update(data).digest('base64url')

/**
 * Frappe un jeton backend pour la session courante.
 *
 * Aucune valeur de repli : si la clé manque ou si le rôle n'ouvre pas droit,
 * la fonction dit précisément pourquoi et l'appelant rend un état honnête.
 */
export function mintBackendToken(session: SessionUser): MintResult {
  const key = signingKey()
  if (!key) {
    return {
      ok: false,
      reason: 'not_configured',
      detail:
        "SESSION_SIGNING_KEY n'est pas configurée sur ce déploiement (32 caractères minimum) : aucun appel authentifié n'est émis.",
    }
  }

  const role = toBackendRole(session.role)
  if (!role) {
    return {
      ok: false,
      reason: 'forbidden',
      detail: `Le rôle ${session.role} n'ouvre pas d'accès à la console d'administration du backend.`,
    }
  }

  // Identifiant canonique : ne JAMAIS supposer qu'un e-mail vaut un identifiant
  // de base. Tant que la session ne porte pas d'ID issu du vrai enregistrement
  // utilisateur, on refuse plutôt que de deviner.
  const userId = session.userId
  if (!userId) {
    return {
      ok: false,
      reason: 'no_canonical_id',
      detail:
        "La session ne porte pas d'identifiant utilisateur canonique. Un e-mail n'est pas un identifiant de base : aucun jeton n'est frappé.",
    }
  }

  const payload: TokenPayload = { userId, role, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }
  const data = encode(JSON.stringify(payload))
  return { ok: true, token: `${data}.${sign(data, key)}`, role }
}

/**
 * Vérifie un jeton frappé ici. Sert aux tests et au diagnostic ; le backend
 * refait sa propre vérification, qui fait foi.
 */
export function verifyBackendToken(token: string): TokenPayload | null {
  const key = signingKey()
  if (!key) return null

  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const expected = sign(data, key)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null

  let payload: TokenPayload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
  if (!payload.userId || (payload.role !== 'admin' && payload.role !== 'investor')) return null

  return payload
}
