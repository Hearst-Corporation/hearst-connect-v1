import { available, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Adaptateur canonique : un champ résolu backend `{ status, value, reason }`
 * → `Availability<T>`, en LISANT le statut réel de la source.
 *
 * ── Pourquoi (VER-10 / audit F-05) ─────────────────────────────────────────
 * Les pages badgeaient un compte dérivé (`list.length`) en `provenance:'live'`
 * dès que la VALEUR était présente, sans jamais consulter `bloc.status`. Une
 * donnée que le backend a lui-même signalée `STALE`/`PARTIAL` s'affichait donc
 * aussi fraîche qu'une donnée `LIVE`. C'est la cause racine du faux « En direct ».
 *
 * Cet adaptateur est le point de passage unique manquant : une valeur `LIVE`
 * devient `available(..., provenance:'indexed', stale:false)` → signal `live` ;
 * une valeur `STALE`/`SNAPSHOT`/`PARTIAL` devient `stale:true` → signal `stale` ;
 * toute autre issue (valeur absente, `NOT_CONFIGURED`, `ERROR`, …) devient une
 * absence nommée. Combiné à `measuredCount`, un compte hérite alors de la
 * fraîcheur réelle de sa source — « 0 mesuré » et « non mesurable » restent des
 * faits opposés, par construction.
 *
 * Frontend pur : ne touche ni au contrat, ni à la donnée, ni à la frontière
 * fork↔back-end. Il ne fait que RENDRE honnêtement ce que la source annonce déjà.
 */

export type BlocResolu<T> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/** Statuts qui portent une valeur affichable et fraîche. */
const FRAIS: ReadonlySet<string> = new Set(['LIVE'])
/** Statuts qui portent une valeur affichable mais datée. */
const DATE: ReadonlySet<string> = new Set(['STALE', 'SNAPSHOT', 'PARTIAL'])
/** Statuts connus du modèle `Resolved` — les autres retombent sur `UNAVAILABLE`. */
const CONNUS: ReadonlySet<string> = new Set([
  'LIVE',
  'STALE',
  'PARTIAL',
  'EMPTY',
  'NOT_CONFIGURED',
  'UNAVAILABLE',
  'NOT_SUPPORTED',
  'PERMISSION_DENIED',
  'SIMULATED',
  'ERROR',
])

function statutCanonique(brut: string): ResolvedStatus | 'NOT_EXPOSED' {
  return (CONNUS.has(brut) ? brut : 'UNAVAILABLE') as ResolvedStatus | 'NOT_EXPOSED'
}

export function availabilityFromResolu<T>(
  bloc: BlocResolu<T> | null | undefined,
  endpoint: string,
): Availability<T> {
  if (bloc?.value == null) {
    return unavailable({
      endpoint,
      status: bloc != null ? statutCanonique(bloc.status) : 'UNAVAILABLE',
      reason: bloc?.reason ?? null,
    })
  }
  if (FRAIS.has(bloc.status)) {
    return available(bloc.value, { provenance: 'indexed', stale: false, asOf: null })
  }
  if (DATE.has(bloc.status)) {
    return available(bloc.value, { provenance: 'indexed', stale: true, asOf: null })
  }
  // Valeur présente sous un statut non affichable (NOT_CONFIGURED, ERROR, …) :
  // on ne la présente pas comme une lecture — c'est une absence nommée.
  return unavailable({ endpoint, status: statutCanonique(bloc.status), reason: bloc.reason ?? null })
}

/**
 * Formate une valeur résolue backend en lecture affichable, en propageant
 * le statut réel — jamais de `stale: false` forcé.
 */
export function figureDepuisResolu<T>(
  bloc: BlocResolu<T> | null | undefined,
  endpoint: string,
  format: (value: T) => string,
): Availability<string> {
  return mapAvailability(availabilityFromResolu(bloc, endpoint), format)
}
