/**
 * Charge utile de `GET /api/v1/runtime` — type partagé (F-03).
 * Une seule définition pour `/admin/runtime` et `/admin/operations`.
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

/** Mappe un statut brut d'indexeur / ordonnanceur vers la matrice d'état admin. */
export function runtimeMatrixStatus(raw: string | undefined): 'LIVE' | 'PARTIAL' | 'UNAVAILABLE' {
  if (raw === 'ready' || raw === 'CONFIGURED' || raw === 'RUNNING' || raw === 'running') return 'LIVE'
  if (raw === 'STALLED' || raw === 'stalled') return 'UNAVAILABLE'
  if (raw === undefined || raw === null || raw === '') return 'UNAVAILABLE'
  return 'PARTIAL'
}

export function runtimeStatusLabel(raw: string | undefined | null): string {
  switch (raw) {
    case 'ready':
      return 'Joignable'
    case 'CONFIGURED':
      return 'Configuré'
    case 'RUNNING':
      return 'En cours'
    case 'running':
      return 'Actif'
    case 'STALLED':
    case 'stalled':
      return 'Bloqué'
    case 'NOT_CONFIGURED':
      return 'Non configuré'
    case 'unreachable':
      return 'Injoignable'
    case 'disabled':
      return 'Désactivé'
    default:
      return raw ?? 'Non renseigné'
  }
}
