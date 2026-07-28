/**
 * Contract for the state of displayed data.
 *
 * Single rule: a value is only rendered if the backend actually provided it.
 * Any other situation is a named state, never an invented value nor a
 * placeholder zero.
 *
 * `null` is not `0`. An absence is not a data point.
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

/** Traceability: where the data comes from (or should have come from). */
export type Provenance = {
  /** Backend route queried, or the expected one if the source isn't wired up. */
  route: string | null
  /** Exact field read from the response. */
  field: string | null
  /** ISO timestamp of the response, when there was one. */
  fetchedAt: string | null
  /** Correlation identifier returned by the backend. */
  requestId: string | null
}

export type Resolved<T> = {
  status: ResolvedStatus
  /** Set only for LIVE, STALE and PARTIAL. `null` everywhere else. */
  value: T | null
  /** Backend-originated explanation, displayable as-is. */
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

  /** Only the sub-values actually received are carried by `value`. */
  partial: <T>(value: T, reason: string, provenance: Partial<Provenance>): Resolved<T> =>
    make<T>('PARTIAL', value, reason, provenance),

  /** The backend responded, and the response contains no element. */
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

/** A value is only displayable in these three states. */
export function hasDisplayableValue<T>(r: Resolved<T>): r is Resolved<T> & { value: T } {
  return (r.status === 'LIVE' || r.status === 'STALE' || r.status === 'PARTIAL') && r.value !== null
}

/**
 * Renders a number. A missing value is never converted to 0: it renders as
 * "—", regardless of the caller.
 */
export function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
}
