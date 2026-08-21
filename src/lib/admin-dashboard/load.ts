import 'server-only'

import {
  fetchActivityTimeseries,
  fetchMarketSnapshot,
  fetchPortfolioExposure,
  fetchPortfolioOverview,
  fetchRebalancingHistory,
  fetchRebalancingOperations,
  fetchRebalancingSummary,
  fetchRecentActivity,
  fetchRecentClients,
  type BackendResolved,
} from '@/lib/admin-dashboard/cache'
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
  type AdminExposureStrategy,
  type AdminMarketSnapshot,
  type AdminOperationsSurface,
  type AdminPortfolioOverview,
  type AdminRecentClient,
  type AdminRebalancingAlert,
  type AdminRebalancingHistoryPoint,
  type AdminRebalancingOperation,
  type AdminRebalancingSummary,
  type AdminTimeseriesPoint,
} from '@/lib/admin-dashboard/contracts'

import type {
  AdminActivityEvent,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminOperationsSurface,
  AdminPortfolioOverview,
  AdminRecentClient,
  AdminRebalancingHistoryPoint,
  AdminRebalancingOperation,
  AdminRebalancingSummary,
  AdminTimeseriesPoint,
} from '@/lib/admin-dashboard/contracts'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'

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

/* ── Granular read models ────────────────────────────────────────────────────
   One loader per backend read model, all backed by the React-cache fetchers
   in `./cache` — Suspense panels and page composers share the same request
   without duplicate backend calls. */

export async function loadAdminOverview(): Promise<Availability<AdminPortfolioOverview>> {
  const res = await fetchPortfolioOverview()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.overview : undefined,
    '/api/v1/admin/portfolio/overview',
  )
}

export async function loadAdminExposure(): Promise<Availability<readonly AdminExposureStrategy[]>> {
  const res = await fetchPortfolioExposure()
  const bloc = fromBackendOrUnavailable(
    res,
    res.ok ? res.data.exposure : undefined,
    '/api/v1/admin/portfolio/exposure',
  )
  return unwrapAvailableField(bloc, 'strategies')
}

export async function loadAdminRebalancingSummary(): Promise<Availability<AdminRebalancingSummary>> {
  const res = await fetchRebalancingSummary()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.summary : undefined,
    '/api/v1/admin/rebalancing/summary',
  )
}

export async function loadAdminRebalancingHistory(
  limit = 90,
): Promise<Availability<readonly AdminRebalancingHistoryPoint[]>> {
  const res = await fetchRebalancingHistory(limit)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.history : undefined,
    '/api/v1/rebalancing/history',
  )
}

export async function loadAdminRebalancingOperations(
  limit = 50,
): Promise<Availability<readonly AdminRebalancingOperation[]>> {
  const res = await fetchRebalancingOperations(limit)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.operations : undefined,
    '/api/v1/rebalancing/operations',
  )
}

export async function loadAdminActivityTimeseries(
  range = '28d',
): Promise<Availability<readonly AdminTimeseriesPoint[]>> {
  const res = await fetchActivityTimeseries(range)
  const bloc = fromBackendOrUnavailable(
    res,
    res.ok ? res.data.timeseries : undefined,
    '/api/v1/admin/activity/timeseries',
  )
  return unwrapAvailableField(bloc, 'series')
}

export async function loadAdminMarketSnapshot(): Promise<Availability<AdminMarketSnapshot>> {
  const res = await fetchMarketSnapshot()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.snapshot : undefined,
    '/api/v1/admin/market/snapshot',
  )
}

export async function loadAdminRecentClients(
  limit = 5,
): Promise<Availability<readonly AdminRecentClient[]>> {
  const res = await fetchRecentClients(limit)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.clients : undefined,
    '/api/v1/admin/clients/recent',
  )
}

export async function loadAdminRecentActivity(
  limit = 10,
): Promise<Availability<readonly AdminActivityEvent[]>> {
  const res = await fetchRecentActivity(limit)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.events : undefined,
    '/api/v1/admin/activity/recent',
  )
}

/**
 * Portfolio asset scale (asset + decimals) from the backend overview.
 * Returns null when the overview is unavailable — atomic amounts must then be
 * rendered without a blind decimal assumption, never with a hardcoded 6dp.
 */
export async function loadAdminAssetScale(): Promise<AdminAssetScale | null> {
  const overview = await loadAdminOverview()
  return isAvailable(overview)
    ? { asset: overview.value.asset, decimals: overview.value.decimals }
    : null
}

/**
 * Client directory for `/admin/clients` — same backend read model as the
 * dashboard strip, with a higher limit for the operating surface.
 */
export async function loadAdminClientsDirectory(
  limit = 100,
): Promise<Availability<readonly AdminRecentClient[]>> {
  return loadAdminRecentClients(limit)
}

/** Focused read models for `/admin/operations` — no market/portfolio extras. */
export async function loadAdminOperationsSurface(): Promise<AdminOperationsSurface> {
  const [rebalancing, recentActivity, overview, exposure, rebalancingHistory, rebalancingOperations] =
    await Promise.all([
      loadAdminRebalancingSummary(),
      loadAdminRecentActivity(25),
      loadAdminOverview(),
      loadAdminExposure(),
      loadAdminRebalancingHistory(90),
      loadAdminRebalancingOperations(50),
    ])

  return {
    rebalancing,
    recentActivity,
    // Real portfolio scale — absent overview stays absent (null), never a blind 6-decimal assumption.
    assetScale: isAvailable(overview)
      ? { asset: overview.value.asset, decimals: overview.value.decimals }
      : null,
    exposure,
    rebalancingHistory,
    rebalancingOperations,
  }
}
