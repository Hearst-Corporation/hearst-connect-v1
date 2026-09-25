import 'server-only'

import { cache } from 'react'
import { callBackend } from '@/lib/backend/client'
import type { Offer } from '@/lib/offers/model'
import type { ComputeFleet, ProductionCost } from '@/lib/product/readings'
import type {
  AdminApproval,
  AdminBtcReserve,
  AdminVaultRecord,
  AdminActivityEvent,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminPortfolioOverview,
  AdminRecentClient,
  AdminRebalancingHistoryPoint,
  AdminRebalancingOperation,
  AdminRebalancingSummary,
  AdminTimeseriesPoint,
  AdminBucketYield,
  AdminClientDistribution,
  AdminClientMovement,
  AdminClientVault,
  OfferSimulation,
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

/*
 * Le coût de production et le parc sont les MÊMES lectures que côté client :
 * l'admin les regarde pour piloter, le client pour comprendre. Une seule
 * définition de type (`lib/product/readings`), deux surfaces.
 */
export const fetchProductionCost = cache(() =>
  callBackend<{ productionCost: BackendResolved<ProductionCost> }>('mining-production-cost'),
)

export const fetchFleet = cache(() =>
  callBackend<{ fleet: BackendResolved<ComputeFleet> }>('mining-fleet'),
)

export const fetchApprovals = cache(() =>
  callBackend<{ approvals: BackendResolved<readonly AdminApproval[]> }>('admin-approvals'),
)

export const fetchVaultRegistry = cache(() =>
  callBackend<{ vaults: BackendResolved<readonly AdminVaultRecord[]> }>('admin-vaults-registry'),
)

export const fetchOffers = cache(() =>
  callBackend<{ offers: BackendResolved<readonly Offer[]> }>('admin-offers'),
)

/* ── La fiche d'un client ──────────────────────────────────────────────────
   Quatre lectures scopées par client, là où les surfaces admin existantes
   étaient globales. */

export const fetchOfferSimulation = cache(
  (id: string, params: Record<string, number>) =>
    callBackend<{ simulation: BackendResolved<OfferSimulation> }>('admin-offer-simulate', {
      params: { id, ...params },
    }),
)

export const fetchClientVault = cache((id: string) =>
  callBackend<{ vault: BackendResolved<AdminClientVault> }>('admin-client-vault', {
    params: { id },
  }),
)

export const fetchClientBucketYields = cache((id: string) =>
  callBackend<{ yields: BackendResolved<readonly AdminBucketYield[]> }>(
    'admin-client-bucket-yields',
    { params: { id } },
  ),
)

export const fetchClientDistributions = cache((id: string) =>
  callBackend<{ distributions: BackendResolved<readonly AdminClientDistribution[]> }>(
    'admin-client-distributions',
    { params: { id } },
  ),
)

export const fetchClientMovements = cache((id: string) =>
  callBackend<{ movements: BackendResolved<readonly AdminClientMovement[]> }>(
    'admin-client-movements',
    { params: { id } },
  ),
)

export const fetchBtcReserve = cache(() =>
  callBackend<{ reserve: BackendResolved<AdminBtcReserve> }>('admin-btc-reserve'),
)

export const fetchRecentClients = cache((limit: number) =>
  callBackend<{ clients: BackendResolved<readonly AdminRecentClient[]> }>('admin-clients-recent', {
    params: { limit },
  }),
)
