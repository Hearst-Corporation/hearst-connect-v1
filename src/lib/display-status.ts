import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Display-status guard.
 *
 * The backend exposes some statuses as a free-form `string`. Display
 * components (`StatusBadge`, `AdminStatus`) instead index dictionaries
 * closed over `ResolvedStatus | 'SNAPSHOT'`: a value outside that dictionary
 * produces an `undefined` color class and the literal label "undefined" on
 * screen. This module closes that gap by validating the received string
 * instead of forcing it through a cast.
 */

export type DisplayStatus = ResolvedStatus | 'SNAPSHOT'

/**
 * Exhaustive table of displayable statuses.
 *
 * The `Record<DisplayStatus, true>` type forces TypeScript to flag any
 * missing member: if `ResolvedStatus` gains a value tomorrow, compilation
 * fails here instead of silently drifting. A plain string array wouldn't
 * offer that guarantee.
 */
const DISPLAYABLE_STATUSES: Record<DisplayStatus, true> = {
  LIVE: true,
  SNAPSHOT: true,
  STALE: true,
  PARTIAL: true,
  EMPTY: true,
  SIMULATED: true,
  NOT_CONFIGURED: true,
  UNAVAILABLE: true,
  NOT_SUPPORTED: true,
  PERMISSION_DENIED: true,
  ERROR: true,
}

/**
 * Fallback for a value we can't interpret.
 *
 * `UNAVAILABLE`, not `LIVE`: showing "Live" for an unrecognized status would
 * certify a freshness nothing establishes. The choice mirrors
 * `statusFromMeta` (`src/lib/backend/client.ts`), whose `default` already
 * falls back to `UNAVAILABLE` — same house, same fallback.
 */
const UNKNOWN_STATUS: DisplayStatus = 'UNAVAILABLE'

/** True if the string is exactly one of the displayable statuses. */
function isDisplayStatus(value: string): value is DisplayStatus {
  return Object.hasOwn(DISPLAYABLE_STATUSES, value)
}

/**
 * Renders a safe status from a backend string.
 *
 * An absence (`null`/`undefined`) and an unknown value are treated
 * identically: in both cases, we have no readable state to announce.
 */
export function displayStatus(value: string | null | undefined): DisplayStatus {
  if (value === null || value === undefined) return UNKNOWN_STATUS
  return isDisplayStatus(value) ? value : UNKNOWN_STATUS
}
