import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Three user-facing backend states (HC-ENDPOINT-ONLY-UI-001).
 *
 * LIVE    — successful request, LIVE data, freshness not stale.
 * OFFLINE — source unreachable, not configured, or no connection.
 * ISSUE   — error, permission, STALE/PARTIAL, unexpected contract.
 */

export type BackendState = 'LIVE' | 'OFFLINE' | 'ISSUE'

const OFFLINE: ReadonlySet<string> = new Set(['UNAVAILABLE', 'NOT_CONFIGURED', 'NOT_EXPOSED'])

export function backendStateFrom<T>(reading: Availability<T>): BackendState {
  if (!isAvailable(reading)) {
    return OFFLINE.has(reading.status) ? 'OFFLINE' : 'ISSUE'
  }
  const signal = signalOf(reading)
  if (signal === 'live') return 'LIVE'
  if (signal === 'stale') return 'ISSUE'
  return 'LIVE'
}

export function backendStateLabel(state: BackendState): string {
  switch (state) {
    case 'LIVE':
      return 'Live'
    case 'OFFLINE':
      return 'Offline'
    case 'ISSUE':
      return 'Issue'
  }
}
