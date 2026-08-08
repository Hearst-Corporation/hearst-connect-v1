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
  type AdminDashboardData,
  type AdminDataHealthSource,
  type AdminExposureStrategy,
  type AdminMarketSnapshot,
  type AdminOperationsSurface,
  type AdminPortfolioOverview,
  type AdminRecentClient,
  type AdminRebalancingAlert,
  type AdminRebalancingSummary,
  type AdminTimeseriesPoint,
  type AdminVaultSummary,
} from '@/lib/admin-dashboard/contracts'

import type {
  AdminActivityEvent,
  AdminDashboardData,
  AdminDataHealthSource,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminOperationsSurface,
  AdminPortfolioOverview,
  AdminRecentClient,
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

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const [
    overviewRes,
    exposureRes,
    rebalancingRes,
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

  const overview = overviewRes.ok ? fromBackend(overviewRes.data.overview, '/api/v1/admin/portfolio/overview') : unavailable({ endpoint: '/api/v1/admin/portfolio/overview', reason: 'service_did_not_respond' })

  const exposureBloc = exposureRes.ok ? fromBackend(exposureRes.data.exposure, '/api/v1/admin/portfolio/exposure') : unavailable({ endpoint: '/api/v1/admin/portfolio/exposure', reason: 'service_did_not_respond' })
  const exposure = isAvailable(exposureBloc)
    ? available(exposureBloc.value.strategies, {
        provenance: exposureBloc.provenance,
        asOf: exposureBloc.asOf,
        stale: exposureBloc.stale,
        resolutionStatus: exposureBloc.resolutionStatus,
      })
    : exposureBloc

  const totalAumFromExposure = isAvailable(exposureBloc)
    ? available(exposureBloc.value.totalAumAtomic, {
        provenance: exposureBloc.provenance,
        asOf: exposureBloc.asOf,
        stale: exposureBloc.stale,
        resolutionStatus: exposureBloc.resolutionStatus,
      })
    : overviewRes.ok && isAvailable(overview)
      ? available(overview.value.totalAumAtomic, {
          provenance: overview.provenance,
          asOf: overview.asOf,
          stale: overview.stale,
          resolutionStatus: overview.resolutionStatus,
        })
      : unavailable({ endpoint: '/api/v1/admin/portfolio/overview', reason: 'total_aum_not_reported' })

  const rebalancing = rebalancingRes.ok ? fromBackend(rebalancingRes.data.summary, '/api/v1/admin/rebalancing/summary') : unavailable({ endpoint: '/api/v1/admin/rebalancing/summary', reason: 'service_did_not_respond' })

  const timeseriesBloc = timeseriesRes.ok ? fromBackend(timeseriesRes.data.timeseries, '/api/v1/admin/activity/timeseries') : unavailable({ endpoint: '/api/v1/admin/activity/timeseries', reason: 'service_did_not_respond' })
  const activityTimeseries = isAvailable(timeseriesBloc)
    ? available(timeseriesBloc.value.series, {
        provenance: timeseriesBloc.provenance,
        asOf: timeseriesBloc.asOf,
        stale: timeseriesBloc.stale,
        resolutionStatus: timeseriesBloc.resolutionStatus,
      })
    : timeseriesBloc

  const market = marketRes.ok ? fromBackend(marketRes.data.snapshot, '/api/v1/admin/market/snapshot') : unavailable({ endpoint: '/api/v1/admin/market/snapshot', reason: 'service_did_not_respond' })

  const vaultsBloc = vaultsRes.ok ? fromBackend(vaultsRes.data.vaultsSummary, '/api/v1/admin/vaults/summary') : unavailable({ endpoint: '/api/v1/admin/vaults/summary', reason: 'service_did_not_respond' })
  const vaults = isAvailable(vaultsBloc)
    ? available(vaultsBloc.value.vaults, {
        provenance: vaultsBloc.provenance,
        asOf: vaultsBloc.asOf,
        stale: vaultsBloc.stale,
        resolutionStatus: vaultsBloc.resolutionStatus,
      })
    : vaultsBloc
  const vaultsTotalAum = isAvailable(vaultsBloc)
    ? available(vaultsBloc.value.totalAumAtomic, {
        provenance: vaultsBloc.provenance,
        asOf: vaultsBloc.asOf,
        stale: vaultsBloc.stale,
        resolutionStatus: vaultsBloc.resolutionStatus,
      })
    : unavailable({ endpoint: '/api/v1/admin/vaults/summary', reason: 'total_aum_not_reported' })

  const recentClients = clientsRes.ok ? fromBackend(clientsRes.data.clients, '/api/v1/admin/clients/recent') : unavailable({ endpoint: '/api/v1/admin/clients/recent', reason: 'service_did_not_respond' })

  const recentActivity = activityRes.ok ? fromBackend(activityRes.data.events, '/api/v1/admin/activity/recent') : unavailable({ endpoint: '/api/v1/admin/activity/recent', reason: 'service_did_not_respond' })

  const dataHealth = healthRes.ok
    ? fromBackend(healthRes.data.sources, '/api/v1/admin/data-health')
    : unavailable({ endpoint: '/api/v1/admin/data-health', reason: 'service_did_not_respond' })

  return {
    overview,
    exposure,
    totalAumAtomic: isAvailable(overview)
      ? available(overview.value.totalAumAtomic, {
          provenance: overview.provenance,
          asOf: overview.asOf,
          stale: overview.stale,
          resolutionStatus: overview.resolutionStatus,
        })
      : totalAumFromExposure,
    rebalancing,
    activityTimeseries,
    market,
    vaults,
    vaultsTotalAum,
    recentClients,
    recentActivity,
    dataHealth,
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
