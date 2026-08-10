import { available, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Canonical adapter: a backend resolved field `{ status, value, reason }`
 * → `Availability<T>`, by READING the source's actual status.
 *
 * ── Why (VER-10 / audit F-05) ──────────────────────────────────────────────
 * Pages badged a derived count (`list.length`) as `provenance:'live'` as soon
 * as the VALUE was present, without ever consulting `block.status`. Data the
 * backend had itself flagged as `STALE`/`PARTIAL` was therefore displayed as
 * fresh as `LIVE` data. This is the root cause of the false "Live" badge.
 *
 * This adapter is the missing single point of passage: a `LIVE` value becomes
 * `available(..., provenance:'indexed', stale:false)` → `live` signal; a
 * `STALE`/`SNAPSHOT`/`PARTIAL` value becomes `stale:true` → `stale` signal;
 * any other outcome (absent value, `NOT_CONFIGURED`, `ERROR`, …) becomes a
 * named absence. Combined with `measuredCount`, a count then inherits the real
 * freshness of its source — "0 measured" and "not measurable" remain opposite
 * facts, by construction.
 *
 * Pure frontend: touches neither the contract, nor the data, nor the
 * fork↔backend boundary. It only HONESTLY RENDERS what the source already
 * announces.
 */

export type ResolvedBlock<T> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/** Statuses that carry a displayable and fresh value. */
const FRESH: ReadonlySet<string> = new Set(['LIVE'])
/** Statuses that carry a displayable but dated value. */
const DATED: ReadonlySet<string> = new Set(['STALE', 'SNAPSHOT', 'PARTIAL'])
/** Statuses known to the `Resolved` model — the others fall back to `UNAVAILABLE`. */
const KNOWN: ReadonlySet<string> = new Set([
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

function canonicalStatus(raw: string): ResolvedStatus | 'NOT_EXPOSED' {
  return (KNOWN.has(raw) ? raw : 'UNAVAILABLE') as ResolvedStatus | 'NOT_EXPOSED'
}

export function availabilityFromResolved<T>(
  block: ResolvedBlock<T> | null | undefined,
  endpoint: string,
): Availability<T> {
  if (block?.value == null) {
    return unavailable({
      endpoint,
      status: block != null ? canonicalStatus(block.status) : 'UNAVAILABLE',
      reason: block?.reason ?? null,
    })
  }
  if (FRESH.has(block.status)) {
    return available(block.value, { provenance: 'indexed', stale: false, asOf: null })
  }
  if (DATED.has(block.status)) {
    return available(block.value, { provenance: 'indexed', stale: true, asOf: null })
  }
  // Value present under a non-displayable status (NOT_CONFIGURED, ERROR, …):
  // we do not present it as a reading — it is a named absence.
  return unavailable({ endpoint, status: canonicalStatus(block.status), reason: block.reason ?? null })
}

/**
 * Formats a resolved backend value into a displayable reading, propagating
 * the real status — never a forced `stale: false`.
 */
export function figureFromResolved<T>(
  block: ResolvedBlock<T> | null | undefined,
  endpoint: string,
  format: (value: T) => string,
): Availability<string> {
  return mapAvailability(availabilityFromResolved(block, endpoint), format)
}
