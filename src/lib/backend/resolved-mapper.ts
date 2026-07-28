import { resolved, type Resolved } from '../resolved'

/**
 * "Backend `Resolved` → display `Resolved`" translation.
 *
 * The backend serializes its fields in its own shape (status, provenance,
 * freshness) that the UI doesn't consume directly: it speaks the `Resolved`
 * of `src/lib/resolved.ts`. This module is the only crossing point between
 * the two, alongside `http-failure.ts`, which plays the same role for HTTP
 * failures.
 *
 * Absolute prohibitions, guaranteed by construction:
 *   - no business fallback, no default value;
 *   - a null value announced as "present" becomes a named error state,
 *     never a zero.
 */

/** `Resolved<T>` as the backend serializes it (distinct from the display type). */
export type BackendResolved<T> = {
  status: 'LIVE' | 'STALE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_CONFIGURED' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED'
  value: T | null
  provenance: 'live' | 'db' | 'indexed' | 'manual' | 'fixture'
  freshness: { asOf: string | null; ageSeconds: number | null; stale: boolean }
  reason?: string
}

/**
 * Converts a backend `Resolved` into a display `Resolved`.
 *
 * Data announced with `provenance: "fixture"` by the backend is marked
 * SIMULATED: it must never be presented as a real measurement.
 */
export function fromBackendResolved<T>(
  field: BackendResolved<T> | null | undefined,
  context: { route: string; field: string; fetchedAt: string | null; requestId: string | null },
): Resolved<T> {
  const provenance = { ...context }

  if (!field) {
    return resolved.notSupported('Field missing from the backend response.', provenance)
  }

  if (field.provenance === 'fixture') {
    return {
      status: 'SIMULATED',
      value: null,
      reason: 'Simulated data on the backend — not usable in production.',
      provenance: { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt },
    }
  }

  const withFreshness = { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt }
  const reason = field.reason ?? null

  switch (field.status) {
    case 'LIVE':
      return field.value === null
        ? resolved.error('LIVE status announced with a null value.', withFreshness)
        : resolved.live(field.value, withFreshness)
    case 'STALE':
      return field.value === null
        ? resolved.error('STALE status announced with a null value.', withFreshness)
        : resolved.stale(field.value, reason ?? 'Insufficient freshness.', withFreshness)
    case 'PARTIAL':
      return field.value === null
        ? resolved.error('PARTIAL status announced with a null value.', withFreshness)
        : resolved.partial(field.value, reason ?? 'Partial response.', withFreshness)
    case 'NOT_CONFIGURED':
      return resolved.notConfigured(reason ?? 'Source not configured.', withFreshness)
    case 'NOT_SUPPORTED':
      return resolved.notSupported(reason ?? 'Not supported by the contract.', withFreshness)
    case 'PERMISSION_DENIED':
      return resolved.permissionDenied(reason ?? 'Insufficient rights.', withFreshness)
    case 'UNAVAILABLE':
    default:
      return resolved.unavailable(reason ?? 'Data unavailable.', withFreshness)
  }
}
