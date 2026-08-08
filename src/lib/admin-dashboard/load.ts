import 'server-only'

import { callBackend } from '@/lib/backend/client'
import {
  available,
  isAvailable,
  unavailable,
  type Availability,
} from '@/lib/vaults/model'

/** Backend `Resolved<T>` block as returned inside envelope data. */
type BackendResolved<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
  provenance?: string | null
  freshness?: { asOf?: string | null; ageSeconds?: number | null; stale?: boolean } | null
}>

function fromBackend<T>(bloc: BackendResolved<T> | undefined, endpoint: string): Availability<T> {
  if (bloc === undefined) {
    return unavailable({ endpoint, status: 'UNAVAILABLE', reason: 'field_absent_from_response' })
  }
  if (bloc.value === null || bloc.value === undefined) {
    return unavailable({
      endpoint,
      reason: bloc.reason ?? null,
      status: (bloc.status as never) ?? 'UNAVAILABLE',
    })
  }
  return available(bloc.value, {
    provenance: bloc.provenance === 'db' ? 'db' : bloc.provenance === 'indexed' ? 'indexed' : 'chain',
    asOf: bloc.freshness?.asOf ?? null,
    stale: bloc.freshness?.stale === true,
  })
}

export type AdminPortfolioOverview = Readonly<{
  totalAumAtomic: string
  asset: string
  decimals: number
  activeVaults: number
  totalVaults: number
  deployedAtomic: string
  availableAtomic: string
  deployedPct: string
  maxDriftBps: number
  maxDriftStrategyId: string | null
  maxDriftStrategyLabel: string | null
  maxDriftVaultId: string | null
}>

export type AdminExposureStrategy = Readonly<{
  strategyId: string
  strategyLabel: string
  vaultId: string
  targetBps: number
  actualBps: number | null
  driftBps: number | null
  exposureAtomic: string | null
  status: string
}>

export type AdminRebalancingAlert = Readonly<{
  strategyId: string
  strategyLabel: string
  vaultId: string
  driftBps: number
}>

export type AdminRebalancingSummary = Readonly<{
  vaultsOutOfTarget: number
  strategiesOutOfTarget: number
  activeVaults: number
  measuredStrategies: number
  maxDriftBps: number | null
  maxDriftStrategyId: string | null
  lastRebalanceAt: string | null
  lastRebalanceTxHash: string | null
  indexerStatus: string
  alerts: readonly AdminRebalancingAlert[]
}>

export type AdminTimeseriesPoint = Readonly<{ at: string; value: number }>

export type AdminMarketSnapshot = Readonly<{
  btcUsd: string | null
  btcChange24hPct: string | null
  hashprice: string | null
  hashpriceChangePct: string | null
  difficulty: string | null
  energyCostUsdKwh: string | null
  miningMarginScore: number | null
  provider: string | null
  asOf: string | null
}>

export type AdminVaultSummary = Readonly<{
  id: string
  label: string
  chainId: number | null
  address: string | null
  totalAssetsAtomic: string
  deployedAtomic: string | null
  availableAtomic: string | null
  deployedPct: string | null
  strategiesCount: number
  maxDriftBps: number | null
  lastActivityAt: string | null
  status: string
}>

export type AdminRecentClient = Readonly<{
  id: string
  label: string
  createdAt: string
  lastActivityAt: string | null
  kycProvider: string
  kycStatus: string
  currentExposureAtomic: string | null
  vaultIds: readonly string[]
}>

export type AdminActivityEvent = Readonly<{
  id: string
  type: string
  title: string
  clientId: string | null
  clientLabel: string | null
  vaultId: string | null
  amountAtomic: string | null
  asset: string | null
  txHash: string | null
  blockNumber: string | null
  occurredAt: string | null
  status: string
}>

export type AdminDataHealthSource = Readonly<{
  key: string
  label: string
  status: string
  asOf: string | null
  freshnessSeconds: number | null
}>

export type AdminDashboardData = Readonly<{
  overview: Availability<AdminPortfolioOverview>
  exposure: Availability<readonly AdminExposureStrategy[]>
  totalAumAtomic: Availability<string>
  rebalancing: Availability<AdminRebalancingSummary>
  activityTimeseries: Availability<readonly AdminTimeseriesPoint[]>
  market: Availability<AdminMarketSnapshot>
  vaults: Availability<readonly AdminVaultSummary[]>
  vaultsTotalAum: Availability<string>
  recentClients: Availability<readonly AdminRecentClient[]>
  recentActivity: Availability<readonly AdminActivityEvent[]>
  dataHealth: Availability<readonly AdminDataHealthSource[]>
}>

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
    ? available(exposureBloc.value.strategies, { provenance: exposureBloc.provenance, asOf: exposureBloc.asOf, stale: exposureBloc.stale })
    : exposureBloc

  const totalAumFromExposure = isAvailable(exposureBloc) ? available(exposureBloc.value.totalAumAtomic, { provenance: exposureBloc.provenance }) : overviewRes.ok && isAvailable(overview) ? available(overview.value.totalAumAtomic, { provenance: 'chain' }) : unavailable({ endpoint: '/api/v1/admin/portfolio/overview', reason: 'total_aum_not_reported' })

  const rebalancing = rebalancingRes.ok ? fromBackend(rebalancingRes.data.summary, '/api/v1/admin/rebalancing/summary') : unavailable({ endpoint: '/api/v1/admin/rebalancing/summary', reason: 'service_did_not_respond' })

  const timeseriesBloc = timeseriesRes.ok ? fromBackend(timeseriesRes.data.timeseries, '/api/v1/admin/activity/timeseries') : unavailable({ endpoint: '/api/v1/admin/activity/timeseries', reason: 'service_did_not_respond' })
  const activityTimeseries = isAvailable(timeseriesBloc)
    ? available(timeseriesBloc.value.series, { provenance: timeseriesBloc.provenance, asOf: timeseriesBloc.asOf })
    : timeseriesBloc

  const market = marketRes.ok ? fromBackend(marketRes.data.snapshot, '/api/v1/admin/market/snapshot') : unavailable({ endpoint: '/api/v1/admin/market/snapshot', reason: 'service_did_not_respond' })

  const vaultsBloc = vaultsRes.ok ? fromBackend(vaultsRes.data.vaultsSummary, '/api/v1/admin/vaults/summary') : unavailable({ endpoint: '/api/v1/admin/vaults/summary', reason: 'service_did_not_respond' })
  const vaults = isAvailable(vaultsBloc)
    ? available(vaultsBloc.value.vaults, { provenance: vaultsBloc.provenance, asOf: vaultsBloc.asOf })
    : vaultsBloc
  const vaultsTotalAum = isAvailable(vaultsBloc)
    ? available(vaultsBloc.value.totalAumAtomic, { provenance: vaultsBloc.provenance })
    : unavailable({ endpoint: '/api/v1/admin/vaults/summary', reason: 'total_aum_not_reported' })

  const recentClients = clientsRes.ok ? fromBackend(clientsRes.data.clients, '/api/v1/admin/clients/recent') : unavailable({ endpoint: '/api/v1/admin/clients/recent', reason: 'service_did_not_respond' })

  const recentActivity = activityRes.ok ? fromBackend(activityRes.data.events, '/api/v1/admin/activity/recent') : unavailable({ endpoint: '/api/v1/admin/activity/recent', reason: 'service_did_not_respond' })

  const dataHealth = healthRes.ok
    ? fromBackend(healthRes.data.sources, '/api/v1/admin/data-health')
    : unavailable({ endpoint: '/api/v1/admin/data-health', reason: 'service_did_not_respond' })

  return {
    overview,
    exposure,
    totalAumAtomic: isAvailable(overview) ? available(overview.value.totalAumAtomic, { provenance: 'chain' }) : totalAumFromExposure,
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

export type AdminOperationsSurface = Readonly<{
  rebalancing: Availability<AdminRebalancingSummary>
  recentActivity: Availability<readonly AdminActivityEvent[]>
}>

/** Focused read models for `/admin/operations` — no market/portfolio extras. */
export async function loadAdminOperationsSurface(): Promise<AdminOperationsSurface> {
  const [rebalancingRes, activityRes] = await Promise.all([
    callBackend<{ summary: BackendResolved<AdminRebalancingSummary> }>('admin-rebalancing-summary'),
    callBackend<{ events: BackendResolved<readonly AdminActivityEvent[]> }>('admin-activity-recent', {
      params: { limit: 25 },
    }),
  ])

  return {
    rebalancing: rebalancingRes.ok
      ? fromBackend(rebalancingRes.data.summary, '/api/v1/admin/rebalancing/summary')
      : unavailable({ endpoint: '/api/v1/admin/rebalancing/summary', reason: 'service_did_not_respond' }),
    recentActivity: activityRes.ok
      ? fromBackend(activityRes.data.events, '/api/v1/admin/activity/recent')
      : unavailable({ endpoint: '/api/v1/admin/activity/recent', reason: 'service_did_not_respond' }),
  }
}
