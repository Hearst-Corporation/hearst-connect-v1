/**
 * Payload of `GET /api/v1/runtime` — shared type (F-03).
 * A single definition for `/admin/runtime` and `/admin/operations`.
 */

export type RuntimeContract = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
  readonly codePresence?: string | null
  readonly codePresent?: boolean | null
}

export type RuntimeIndexerScheduler = {
  readonly status?: string | null
  readonly intervalMs?: number | null
  readonly lastRunAt?: string | null
  readonly lastSuccessAt?: string | null
  readonly consecutiveErrors?: number | null
  readonly lastIndexedBlock?: number | string | null
}

export type RuntimePayload = {
  readonly databaseStatus?: string | null
  readonly contractStatus?: string | null
  readonly indexerStatus?: string | null
  readonly environment?: string | null
  readonly uptimeSeconds?: number | null
  readonly serviceVersion?: string | null
  readonly commitSha?: string | null
  readonly contract?: RuntimeContract | null
  readonly db?: { readonly reachable?: boolean | null; readonly latencyMs?: number | null } | null
  readonly indexer?: { readonly status?: string | null; readonly lastSyncedAt?: string | null } | null
  readonly indexerScheduler?: RuntimeIndexerScheduler | null
}

/** Maps a raw indexer / scheduler status to the admin state matrix. */
export function runtimeMatrixStatus(raw: string | undefined): 'LIVE' | 'PARTIAL' | 'UNAVAILABLE' {
  if (raw === 'ready' || raw === 'CONFIGURED' || raw === 'RUNNING' || raw === 'running') return 'LIVE'
  if (raw === 'STALLED' || raw === 'stalled') return 'UNAVAILABLE'
  if (raw === undefined || raw === null || raw === '') return 'UNAVAILABLE'
  return 'PARTIAL'
}

export function runtimeStatusLabel(raw: string | undefined | null): string {
  switch (raw) {
    case 'ready':
      return 'Reachable'
    case 'CONFIGURED':
      return 'Configured'
    case 'RUNNING':
      return 'Running'
    case 'running':
      return 'Active'
    case 'STALLED':
    case 'stalled':
      return 'Blocked'
    case 'NOT_CONFIGURED':
      return 'Not configured'
    case 'unreachable':
      return 'Unreachable'
    case 'disabled':
      return 'Disabled'
    default:
      return raw ?? 'Not provided'
  }
}
