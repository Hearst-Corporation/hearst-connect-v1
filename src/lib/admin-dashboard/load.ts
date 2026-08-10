import 'server-only'

import { callBackend } from '@/lib/backend/client'
import type { ResolvedStatus } from '@/lib/resolved'
import {
  available,
  isAvailable,
  unavailable,
  type Availability,
  type Provenance,
} from '@/lib/vaults/model'

export {
  isAdminNotConfigured,
  type AdminActivityEvent,
  type AdminAllocationPoint,
  type AdminDashboardData,
  type AdminDataHealthSource,
  type AdminExposureStrategy,
  type AdminMarketSnapshot,
  type AdminOperationsSurface,
  type AdminPortfolioOverview,
  type AdminRecentClient,
  type AdminRebalancingAlert,
  type AdminRebalancingHistoryPoint,
  type AdminRebalancingSummary,
  type AdminTimeseriesPoint,
  type AdminVaultSummary,
} from '@/lib/admin-dashboard/contracts'

import type {
  AdminActivityEvent,
  AdminAllocationPoint,
  AdminDashboardData,
  AdminDataHealthSource,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminOperationsSurface,
  AdminPortfolioOverview,
  AdminRecentClient,
  AdminRebalancingHistoryPoint,
  AdminRebalancingSummary,
  AdminTimeseriesPoint,
  AdminVaultSummary,
} from '@/lib/admin-dashboard/contracts'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'

/** Backend `Resolved<T>` block as returned inside envelope data. */
type BackendResolved<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
  provenance?: string | null
  freshness?: { asOf?: string | null; ageSeconds?: number | null; stale?: boolean } | null
}>

const DISPLAYABLE_STATUSES: ReadonlySet<ResolvedStatus> = new Set(['LIVE', 'STALE', 'PARTIAL', 'EMPTY'])

function mapProvenance(raw: string | null | undefined): Provenance {
  if (raw === 'db') return 'db'
  if (raw === 'indexed') return 'indexed'
  if (raw === 'live') return 'live'
  if (raw === 'manual') return 'manual'
  if (raw === 'chain') return 'chain'
  return 'unknown'
}

function resolvedStatus(raw: string | undefined): ResolvedStatus | 'NOT_EXPOSED' {
  const known: ResolvedStatus[] = [
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
  ]
  if (raw !== undefined && (known as readonly string[]).includes(raw)) {
    return raw as ResolvedStatus
  }
  return 'UNAVAILABLE'
}

function fromBackend<T>(bloc: BackendResolved<T> | undefined, endpoint: string): Availability<T> {
  if (bloc === undefined) {
    return unavailable({ endpoint, status: 'UNAVAILABLE', reason: 'field_absent_from_response' })
  }

  const status = resolvedStatus(bloc.status)
  const provenance = mapProvenance(bloc.provenance)
  const asOf = bloc.freshness?.asOf ?? null
  const stale = bloc.freshness?.stale === true || status === 'STALE'
  const hasValue = bloc.value !== null && bloc.value !== undefined

  if (DISPLAYABLE_STATUSES.has(status as ResolvedStatus) && hasValue) {
    return available(bloc.value as T, {
      provenance,
      asOf,
      stale,
      resolutionStatus: status as ResolvedStatus,
    })
  }

  return unavailable({
    endpoint,
    reason: bloc.reason ?? null,
    status,
  })
}

function fromBackendOrUnavailable<T>(
  res: { ok: boolean },
  bloc: BackendResolved<T> | undefined,
  endpoint: string,
): Availability<T> {
  if (!res.ok) {
    return unavailable({ endpoint, reason: 'service_did_not_respond' })
  }
  return fromBackend(bloc, endpoint)
}

function withBlocMeta<T>(bloc: Availability<unknown>, value: T): Availability<T> {
  if (!isAvailable(bloc)) return bloc as Availability<T>
  return available(value, {
    provenance: bloc.provenance,
    asOf: bloc.asOf,
    stale: bloc.stale,
    resolutionStatus: bloc.resolutionStatus,
  })
}

function unwrapAvailableField<T, K extends keyof T>(
  bloc: Availability<T>,
  field: K,
): Availability<T[K]> {
  if (!isAvailable(bloc)) return bloc as Availability<T[K]>
  return withBlocMeta(bloc, bloc.value[field])
}

function resolveTotalAumFromExposure(
  exposureBloc: Availability<{ strategies: readonly AdminExposureStrategy[]; totalAumAtomic: string }>,
  overview: Availability<AdminPortfolioOverview>,
  overviewResOk: boolean,
): Availability<string> {
  if (isAvailable(exposureBloc)) {
    return withBlocMeta(exposureBloc, exposureBloc.value.totalAumAtomic)
  }
  if (overviewResOk && isAvailable(overview)) {
    return withBlocMeta(overview, overview.value.totalAumAtomic)
  }
  return unavailable({ endpoint: '/api/v1/admin/portfolio/overview', reason: 'total_aum_not_reported' })
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const [
    overviewRes,
    exposureRes,
    rebalancingRes,
    rebalancingHistoryRes,
    timeseriesRes,
    marketRes,
    vaultsRes,
    clientsRes,
    activityRes,
    healthRes,
  ] = await Promise.all([
    callBackend<{ overview: BackendResolved<AdminPortfolioOverview> }>('admin-portfolio-overview'),
    callBackend<{ exposure: BackendResolved<{ strategies: readonly AdminExposureStrategy[]; totalAumAtomic: string }> }>(
      'admin-portfolio-exposure',
    ),
    callBackend<{ summary: BackendResolved<AdminRebalancingSummary> }>('admin-rebalancing-summary'),
    callBackend<{
      history: BackendResolved<{ series: readonly AdminRebalancingHistoryPoint[] }>
    }>('rebalancing-history', { params: { limit: 90 } }),
    callBackend<{ timeseries: BackendResolved<{ series: readonly AdminTimeseriesPoint[] }> }>(
      'admin-activity-timeseries',
      { params: { range: '28d' } },
    ),
    callBackend<{ snapshot: BackendResolved<AdminMarketSnapshot> }>('admin-market-snapshot'),
    callBackend<{ vaultsSummary: BackendResolved<{ vaults: readonly AdminVaultSummary[]; totalAumAtomic: string }> }>(
      'admin-vaults-summary',
    ),
    callBackend<{ clients: BackendResolved<readonly AdminRecentClient[]> }>('admin-clients-recent', {
      params: { limit: 5 },
    }),
    callBackend<{ events: BackendResolved<readonly AdminActivityEvent[]> }>('admin-activity-recent', {
      params: { limit: 10 },
    }),
    callBackend<{ sources: BackendResolved<readonly AdminDataHealthSource[]> }>('admin-data-health'),
  ])

  const overview = fromBackendOrUnavailable(
    overviewRes,
    overviewRes.ok ? overviewRes.data.overview : undefined,
    '/api/v1/admin/portfolio/overview',
  )

  const exposureBloc = fromBackendOrUnavailable(
    exposureRes,
    exposureRes.ok ? exposureRes.data.exposure : undefined,
    '/api/v1/admin/portfolio/exposure',
  )
  const exposure = unwrapAvailableField(exposureBloc, 'strategies')
  const totalAumFromExposure = resolveTotalAumFromExposure(exposureBloc, overview, overviewRes.ok)

  const rebalancing = fromBackendOrUnavailable(
    rebalancingRes,
    rebalancingRes.ok ? rebalancingRes.data.summary : undefined,
    '/api/v1/admin/rebalancing/summary',
  )

  const rebalancingHistoryBloc = fromBackendOrUnavailable(
    rebalancingHistoryRes,
    rebalancingHistoryRes.ok ? rebalancingHistoryRes.data.history : undefined,
    '/api/v1/rebalancing/history',
  )
  const rebalancingHistory = unwrapAvailableField(rebalancingHistoryBloc, 'series')

  const timeseriesBloc = fromBackendOrUnavailable(
    timeseriesRes,
    timeseriesRes.ok ? timeseriesRes.data.timeseries : undefined,
    '/api/v1/admin/activity/timeseries',
  )
  const activityTimeseries = unwrapAvailableField(timeseriesBloc, 'series')

  const market = fromBackendOrUnavailable(
    marketRes,
    marketRes.ok ? marketRes.data.snapshot : undefined,
    '/api/v1/admin/market/snapshot',
  )

  const vaultsBloc = fromBackendOrUnavailable(
    vaultsRes,
    vaultsRes.ok ? vaultsRes.data.vaultsSummary : undefined,
    '/api/v1/admin/vaults/summary',
  )
  const vaults = unwrapAvailableField(vaultsBloc, 'vaults')
  const vaultsTotalAum = isAvailable(vaultsBloc)
    ? withBlocMeta(vaultsBloc, vaultsBloc.value.totalAumAtomic)
    : unavailable({ endpoint: '/api/v1/admin/vaults/summary', reason: 'total_aum_not_reported' })

  // Fetch allocation breakdown (cbBTC + USDC) for the vault with the highest AUM.
  let cbbtcAllocation: Availability<readonly AdminAllocationPoint[]> = unavailable({
    endpoint: '/api/v1/vault/history',
    reason: 'no_vaults_available',
  })
  if (isAvailable(vaults) && vaults.value.length > 0) {
    const topVault = [...vaults.value].sort(
      (a, b) => Number(b.totalAssetsAtomic) - Number(a.totalAssetsAtomic),
    )[0]
    const historyRes = await callBackend<{
      snapshots: BackendResolved<
        readonly {
          takenAt: string
          allocations?: readonly { bucket: string; pct: string; valueUsdc: string }[]
        }[]
      >
    }>('vault-history', { params: { vaultId: topVault.id, limit: 28 } })
    if (historyRes.ok && historyRes.data.snapshots?.value) {
      const points = historyRes.data.snapshots.value
        .map((s) => {
          const cbbtc = s.allocations?.find((a) => a.bucket.toLowerCase().includes('cbbtc'))
          const usdc = s.allocations?.find((a) => a.bucket.toLowerCase().includes('usdc'))
          if (!cbbtc || !usdc) return null
          return {
            at: s.takenAt.slice(0, 10),
            cbbtcPct: Number(cbbtc.pct),
            usdcPct: Number(usdc.pct),
          }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
      cbbtcAllocation = available(points, { provenance: 'unknown' })
    } else {
      cbbtcAllocation = unavailable({
        endpoint: '/api/v1/vault/history',
        reason: historyRes.ok ? 'no_allocation_data' : 'service_did_not_respond',
      })
    }
  }

  const recentClients = fromBackendOrUnavailable(
    clientsRes,
    clientsRes.ok ? clientsRes.data.clients : undefined,
    '/api/v1/admin/clients/recent',
  )

  const recentActivity = fromBackendOrUnavailable(
    activityRes,
    activityRes.ok ? activityRes.data.events : undefined,
    '/api/v1/admin/activity/recent',
  )

  const dataHealth = fromBackendOrUnavailable(
    healthRes,
    healthRes.ok ? healthRes.data.sources : undefined,
    '/api/v1/admin/data-health',
  )

  return {
    overview,
    exposure,
    totalAumAtomic: isAvailable(overview)
      ? withBlocMeta(overview, overview.value.totalAumAtomic)
      : totalAumFromExposure,
    rebalancing,
    activityTimeseries,
    rebalancingHistory,
    market,
    vaults,
    vaultsTotalAum,
    recentClients,
    recentActivity,
    dataHealth,
    cbbtcAllocation,
  }
}

/**
 * Client directory for `/admin/clients` — same backend read model as the
 * dashboard strip, with a higher limit for the operating surface.
 */
export async function loadAdminClientsDirectory(
  limit = 100,
): Promise<Availability<readonly AdminRecentClient[]>> {
  const clientsRes = await callBackend<{ clients: BackendResolved<readonly AdminRecentClient[]> }>(
    'admin-clients-recent',
    { params: { limit } },
  )
  return clientsRes.ok
    ? fromBackend(clientsRes.data.clients, '/api/v1/admin/clients/recent')
    : unavailable({ endpoint: '/api/v1/admin/clients/recent', reason: 'service_did_not_respond' })
}

/**
 * Portfolio asset scale (asset + decimals) from the backend overview.
 * Returns null when the overview is unavailable — atomic amounts must then be
 * rendered without a blind decimal assumption, never with a hardcoded 6dp.
 */
export async function loadAdminAssetScale(): Promise<AdminAssetScale | null> {
  const overviewRes = await callBackend<{ overview: BackendResolved<AdminPortfolioOverview> }>(
    'admin-portfolio-overview',
  )
  if (!overviewRes.ok) return null
  const overview = fromBackend(overviewRes.data.overview, '/api/v1/admin/portfolio/overview')
  return isAvailable(overview)
    ? { asset: overview.value.asset, decimals: overview.value.decimals }
    : null
}

/** Focused read models for `/admin/operations` — no market/portfolio extras. */
export async function loadAdminOperationsSurface(): Promise<AdminOperationsSurface> {
  const [rebalancingRes, activityRes, overviewRes] = await Promise.all([
    callBackend<{ summary: BackendResolved<AdminRebalancingSummary> }>('admin-rebalancing-summary'),
    callBackend<{ events: BackendResolved<readonly AdminActivityEvent[]> }>('admin-activity-recent', {
      params: { limit: 25 },
    }),
    callBackend<{ overview: BackendResolved<AdminPortfolioOverview> }>('admin-portfolio-overview'),
  ])

  const overview = overviewRes.ok
    ? fromBackend(overviewRes.data.overview, '/api/v1/admin/portfolio/overview')
    : unavailable({ endpoint: '/api/v1/admin/portfolio/overview', reason: 'service_did_not_respond' })

  return {
    rebalancing: rebalancingRes.ok
      ? fromBackend(rebalancingRes.data.summary, '/api/v1/admin/rebalancing/summary')
      : unavailable({ endpoint: '/api/v1/admin/rebalancing/summary', reason: 'service_did_not_respond' }),
    recentActivity: activityRes.ok
      ? fromBackend(activityRes.data.events, '/api/v1/admin/activity/recent')
      : unavailable({ endpoint: '/api/v1/admin/activity/recent', reason: 'service_did_not_respond' }),
    // Real portfolio scale — absent overview stays absent (null), never a blind 6-decimal assumption.
    assetScale: isAvailable(overview)
      ? { asset: overview.value.asset, decimals: overview.value.decimals }
      : null,
  }
}
