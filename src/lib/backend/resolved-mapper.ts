import { resolved, type Resolved } from '../resolved'

/**
 * Traduction « `Resolved` backend → `Resolved` d'affichage ».
 *
 * Le backend sérialise ses champs sous une forme propre (statut, provenance,
 * fraîcheur) que l'UI ne consomme pas directement : elle parle le `Resolved`
 * de `src/lib/resolved.ts`. Ce module est le seul point de passage entre les
 * deux, à côté de `http-failure.ts` qui joue le même rôle pour les échecs HTTP.
 *
 * Interdits absolus, garantis par construction :
 *   - aucun fallback métier, aucune valeur par défaut ;
 *   - une valeur nulle annoncée « présente » devient un état d'erreur nommé,
 *     jamais un zéro.
 */

/** `Resolved<T>` tel que le backend le sérialise (distinct du type d'affichage). */
export type BackendResolved<T> = {
  status: 'LIVE' | 'STALE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_CONFIGURED' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED'
  value: T | null
  provenance: 'live' | 'db' | 'indexed' | 'manual' | 'fixture'
  freshness: { asOf: string | null; ageSeconds: number | null; stale: boolean }
  reason?: string
}

/**
 * Convertit un `Resolved` backend en `Resolved` d'affichage.
 *
 * Une donnée annoncée `provenance: "fixture"` par le backend est marquée
 * SIMULATED : elle ne doit jamais être présentée comme une mesure réelle.
 */
export function fromBackendResolved<T>(
  field: BackendResolved<T> | null | undefined,
  context: { route: string; field: string; fetchedAt: string | null; requestId: string | null },
): Resolved<T> {
  const provenance = { ...context }

  if (!field) {
    return resolved.notSupported('Champ absent de la réponse backend.', provenance)
  }

  if (field.provenance === 'fixture') {
    return {
      status: 'SIMULATED',
      value: null,
      reason: 'Donnée simulée côté backend — non exploitable en production.',
      provenance: { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt },
    }
  }

  const withFreshness = { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt }
  const reason = field.reason ?? null

  switch (field.status) {
    case 'LIVE':
      return field.value === null
        ? resolved.error('Statut LIVE annoncé avec une valeur nulle.', withFreshness)
        : resolved.live(field.value, withFreshness)
    case 'STALE':
      return field.value === null
        ? resolved.error('Statut STALE annoncé avec une valeur nulle.', withFreshness)
        : resolved.stale(field.value, reason ?? 'Fraîcheur insuffisante.', withFreshness)
    case 'PARTIAL':
      return field.value === null
        ? resolved.error('Statut PARTIAL annoncé avec une valeur nulle.', withFreshness)
        : resolved.partial(field.value, reason ?? 'Réponse partielle.', withFreshness)
    case 'NOT_CONFIGURED':
      return resolved.notConfigured(reason ?? 'Source non configurée.', withFreshness)
    case 'NOT_SUPPORTED':
      return resolved.notSupported(reason ?? 'Non supporté par le contrat.', withFreshness)
    case 'PERMISSION_DENIED':
      return resolved.permissionDenied(reason ?? 'Droits insuffisants.', withFreshness)
    case 'UNAVAILABLE':
    default:
      return resolved.unavailable(reason ?? 'Donnée indisponible.', withFreshness)
  }
}
