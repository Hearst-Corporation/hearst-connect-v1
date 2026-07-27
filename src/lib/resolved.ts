/**
 * Contrat d'état des données affichées.
 *
 * Règle unique : une valeur n'est rendue que si le backend l'a réellement
 * fournie. Toute autre situation est un état nommé, jamais une valeur inventée
 * ni un zéro de remplacement.
 *
 * `null` n'est pas `0`. Une absence n'est pas une donnée.
 */

export type ResolvedStatus =
  | 'LIVE'
  | 'STALE'
  | 'PARTIAL'
  | 'EMPTY'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'SIMULATED'
  | 'ERROR'

/** Traçabilité : d'où vient (ou aurait dû venir) la donnée. */
export type Provenance = {
  /** Route backend interrogée, ou attendue si la source n'est pas branchée. */
  route: string | null
  /** Champ exact lu dans la réponse. */
  field: string | null
  /** Horodatage ISO de la réponse, quand il y en a eu une. */
  fetchedAt: string | null
  /** Identifiant de corrélation renvoyé par le backend. */
  requestId: string | null
}

export type Resolved<T> = {
  status: ResolvedStatus
  /** Renseigné uniquement pour LIVE, STALE et PARTIAL. `null` partout ailleurs. */
  value: T | null
  /** Explication d'origine backend, affichable telle quelle. */
  reason: string | null
  provenance: Provenance
}

const emptyProvenance: Provenance = { route: null, field: null, fetchedAt: null, requestId: null }

function make<T>(
  status: ResolvedStatus,
  value: T | null,
  reason: string | null,
  provenance: Partial<Provenance>,
): Resolved<T> {
  return { status, value, reason, provenance: { ...emptyProvenance, ...provenance } }
}

export const resolved = {
  live: <T>(value: T, provenance: Partial<Provenance>): Resolved<T> => make<T>('LIVE', value, null, provenance),

  stale: <T>(value: T, reason: string, provenance: Partial<Provenance>): Resolved<T> =>
    make<T>('STALE', value, reason, provenance),

  /** Seules les sous-valeurs réellement reçues sont portées par `value`. */
  partial: <T>(value: T, reason: string, provenance: Partial<Provenance>): Resolved<T> =>
    make<T>('PARTIAL', value, reason, provenance),

  /** Le backend a répondu, et la réponse ne contient aucun élément. */
  empty: <T>(provenance: Partial<Provenance>): Resolved<T> => make<T>('EMPTY', null, null, provenance),

  notConfigured: <T>(reason: string, provenance: Partial<Provenance> = {}): Resolved<T> =>
    make<T>('NOT_CONFIGURED', null, reason, provenance),

  unavailable: <T>(reason: string, provenance: Partial<Provenance> = {}): Resolved<T> =>
    make<T>('UNAVAILABLE', null, reason, provenance),

  notSupported: <T>(reason: string, provenance: Partial<Provenance> = {}): Resolved<T> =>
    make<T>('NOT_SUPPORTED', null, reason, provenance),

  permissionDenied: <T>(reason: string, provenance: Partial<Provenance> = {}): Resolved<T> =>
    make<T>('PERMISSION_DENIED', null, reason, provenance),

  error: <T>(reason: string, provenance: Partial<Provenance> = {}): Resolved<T> =>
    make<T>('ERROR', null, reason, provenance),
}

/** Une valeur n'est affichable que dans ces trois états. */
export function hasDisplayableValue<T>(r: Resolved<T>): r is Resolved<T> & { value: T } {
  return (r.status === 'LIVE' || r.status === 'STALE' || r.status === 'PARTIAL') && r.value !== null
}

/**
 * Rendu d'un nombre. Une valeur absente n'est jamais convertie en 0 : elle
 * s'affiche « — », quel que soit l'appelant.
 */
export function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('fr-FR') : '—'
}
