import { timingSafeEqual } from 'node:crypto'
import { redirect } from 'next/navigation'
import { getSession, type SessionUser } from './session'

/**
 * Annuaire des comptes — lu depuis l'environnement, jamais depuis le code.
 *
 * Le compte propriétaire est défini par `ADRIEN_OWNER_EMAIL` /
 * `ADRIEN_OWNER_PASSWORD` (doctrine Hearst §7). Aucun mot de passe n'est
 * écrit en dur, ici ou ailleurs.
 */

const OWNER_EMAIL_FALLBACK = 'adrien@hearstcorporation.io'

function ownerEmail(): string {
  return (process.env.ADRIEN_OWNER_EMAIL || OWNER_EMAIL_FALLBACK).trim().toLowerCase()
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  // Longueurs comparées hors timingSafeEqual (qui exige des tailles égales) :
  // la longueur d'un mot de passe n'est pas le secret qu'on protège.
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string }

/** Vérifie un couple email / mot de passe contre le compte propriétaire configuré. */
export function authenticate(email: string, password: string): AuthResult {
  const expectedPassword = process.env.ADRIEN_OWNER_PASSWORD

  if (!expectedPassword) {
    return {
      ok: false,
      error: "Aucun compte n'est configuré sur ce déploiement (ADRIEN_OWNER_PASSWORD absent).",
    }
  }

  const submitted = email.trim().toLowerCase()
  const emailMatches = constantTimeEquals(submitted, ownerEmail())
  const passwordMatches = constantTimeEquals(password, expectedPassword)

  if (!emailMatches || !passwordMatches) {
    return { ok: false, error: 'Identifiants invalides.' }
  }

  return {
    ok: true,
    // Identifiant canonique du compte propriétaire. Il vient de
    // l'environnement quand un enregistrement réel existe côté backend ;
    // à défaut, une valeur stable et explicite — jamais l'e-mail.
    user: {
      userId: (process.env.ADRIEN_OWNER_ID || 'owner-adrien').trim(),
      email: ownerEmail(),
      name: 'Adrien',
      role: 'OWNER',
    },
  }
}

/**
 * Garde des routes applicatives : renvoie la session ou redirige vers /login.
 * Utilisée par le layout serveur de `(app)` — la vérification est côté serveur,
 * jamais côté client.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Autorise-t-on la connexion directe sans mot de passe ?
 *
 * Uniquement hors production. `next build` fige `NODE_ENV` à 'production' :
 * sur un déploiement Vercel, cette fonction renvoie toujours `false`, quelles
 * que soient les variables d'environnement du projet.
 */
export function isDevBypassAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export const roleLabel: Record<SessionUser['role'], string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
}
