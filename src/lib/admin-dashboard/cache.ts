import 'server-only'

import { cache } from 'react'
import { callBackend } from '@/lib/backend/client'
import type {
  AdminActivityEvent,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminPortfolioOverview,
  AdminRecentClient,
  AdminRebalancingHistoryPoint,
  AdminRebalancingOperation,
  AdminRebalancingSummary,
  AdminTimeseriesPoint,
} from '@/lib/admin-dashboard/contracts'

/** Backend `Resolved<T>` block as returned inside envelope data. */
export type BackendResolved<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
  provenance?: string | null
  freshness?: { asOf?: string | null; ageSeconds?: number | null; stale?: boolean } | null
}>

/**
 * Per-endpoint fetchers memoized with React `cache()` — identical calls are
 * deduplicated within a single server render, so every Suspense panel (and
 * the dashboard / operations composers) can ask for its own data without
 * multiplying backend requests. Parameterized fetchers key on primitive args.
 */
export const fetchPortfolioOverview = cache(() =>
  callBackend<{ overview: BackendResolved<AdminPortfolioOverview> }>('admin-portfolio-overview'),
)

export const fetchPortfolioExposure = cache(() =>
  callBackend<{
    exposure: BackendResolved<{ strategies: readonly AdminExposureStrategy[]; totalAumAtomic: string }>
  }>('admin-portfolio-exposure'),
)

export const fetchRebalancingSummary = cache(() =>
  callBackend<{ summary: BackendResolved<AdminRebalancingSummary> }>('admin-rebalancing-summary'),
)

export const fetchRebalancingHistory = cache((limit: number) =>
  callBackend<{ history: BackendResolved<readonly AdminRebalancingHistoryPoint[]> }>(
    'rebalancing-history',
    { params: { limit } },
  ),
)

export const fetchRebalancingOperations = cache((limit: number) =>
  callBackend<{ operations: BackendResolved<readonly AdminRebalancingOperation[]> }>(
    'rebalancing-operations',
    { params: { limit } },
  ),
)

export const fetchActivityTimeseries = cache((range: string) =>
  callBackend<{ timeseries: BackendResolved<{ series: readonly AdminTimeseriesPoint[] }> }>(
    'admin-activity-timeseries',
    { params: { range } },
  ),
)

export const fetchRecentActivity = cache((limit: number) =>
  callBackend<{ events: BackendResolved<readonly AdminActivityEvent[]> }>('admin-activity-recent', {
    params: { limit },
  }),
)

export const fetchMarketSnapshot = cache(() =>
  callBackend<{ snapshot: BackendResolved<AdminMarketSnapshot> }>('admin-market-snapshot'),
)

export const fetchRecentClients = cache((limit: number) =>
  callBackend<{ clients: BackendResolved<readonly AdminRecentClient[]> }>('admin-clients-recent', {
    params: { limit },
  }),
)
