import 'server-only'

import {
  fetchActivityTimeseries,
  fetchApprovals,
  fetchFleet,
  fetchProductionCost,
  fetchBtcReserve,
  fetchClientBucketYields,
  fetchClientDistributions,
  fetchClientMovements,
  fetchClientVault,
  fetchOfferSimulation,
  fetchOffers,
  fetchVaultRegistry,
  fetchAumHistory,
  fetchMiningDistributions,
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

import type { Offer } from '@/lib/offers/model'
import type { ComputeFleet, ProductionCost } from '@/lib/product/readings'
import type {
  AdminActivityEvent,
  AdminApproval,
  AdminBtcReserve,
  AdminAumSnapshot,
  AdminMiningDistribution,
  AdminExposureStrategy,
  AdminMarketSnapshot,
  AdminOperationsSurface,
  AdminPortfolioOverview,
  AdminRecentClient,
  AdminRebalancingHistoryPoint,
  AdminRebalancingOperation,
  AdminRebalancingSummary,
  AdminTimeseriesPoint,
  AdminVaultRecord,
  AdminBucketYield,
  AdminClientDistribution,
  AdminClientMovement,
  AdminClientVault,
  OfferSimulation,
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

/**
 * Décisions en attente d'un opérateur, tous clients confondus. C'est la
 * contrepartie de tout ce que l'écran client laisse en suspens : un dépôt
 * demandé, une distribution annoncée, un retrait sollicité.
 */
/** Coût de production d'un bitcoin — la mesure qui dit si miner crée de la valeur. */
export async function loadAdminProductionCost(): Promise<Availability<ProductionCost>> {
  const res = await fetchProductionCost()
  const read = fromBackendOrUnavailable(
    res,
    res.ok ? res.data.productionCost : undefined,
    '/api/v1/mining/production-cost',
  )
  /* La marge est RECALCULÉE, comme sur /account : la source ne la publie pas,
     et une marge lue à 0 affichait « 0% » sous un écart de 32 000 $. */
  return isAvailable(read)
    ? {
        ...read,
        value: {
          ...read.value,
          marginPct:
            read.value.marketPriceUsd > 0
              ? ((read.value.marketPriceUsd - read.value.costPerBtcUsd) / read.value.marketPriceUsd) * 100
              : 0,
        },
      }
    : read
}

/** Parc de calcul, à l'échelle de toute l'infrastructure. */
export async function loadAdminFleet(): Promise<Availability<ComputeFleet>> {
  const res = await fetchFleet()
  return fromBackendOrUnavailable(res, res.ok ? res.data.fleet : undefined, '/api/v1/mining/fleet')
}

export async function loadAdminApprovals(): Promise<Availability<readonly AdminApproval[]>> {
  const res = await fetchApprovals()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.approvals : undefined,
    '/api/v1/admin/approvals',
  )
}

/**
 * Le pipeline commercial — une offre par prospect.
 *
 * C'est la surface qui manquait : entre le premier appel et le vault ouvert, le
 * produit se vend sur mesure, et rien de ce travail n'était visible dans
 * l'outil.
 */
export async function loadAdminOffers(): Promise<Availability<readonly Offer[]>> {
  const res = await fetchOffers()
  return fromBackendOrUnavailable(res, res.ok ? res.data.offers : undefined, '/api/v1/admin/offers')
}

/**
 * La simulation d'une offre. Les paramètres voyagent en query : le montant,
 * l'horizon et l'allocation proposée.
 */
export async function loadOfferSimulation(
  id: string,
  params: Readonly<{
    amountUsdc: number
    months: number
    miningBps: number
    lendingBps: number
    stableBps: number
  }>,
): Promise<Availability<OfferSimulation>> {
  const res = await fetchOfferSimulation(id, { ...params })
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.simulation : undefined,
    `/api/v1/admin/offers/${id}/simulate`,
  )
}

/* ── La fiche d'un client ──────────────────────────────────────────────────
   Quatre lectures scopées par client. Chacune dit son absence pour son propre
   compte : un client dont on ne lit pas les distributions garde son vault. */

export async function loadClientVault(
  id: string,
  vaultId?: string | null,
): Promise<Availability<AdminClientVault>> {
  const res = await fetchClientVault(id, vaultId)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.vault : undefined,
    `/api/v1/admin/clients/${id}/vault`,
  )
}

export async function loadClientBucketYields(
  id: string,
  vaultId?: string | null,
): Promise<Availability<readonly AdminBucketYield[]>> {
  const res = await fetchClientBucketYields(id, vaultId)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.yields : undefined,
    `/api/v1/admin/clients/${id}/bucket-yields`,
  )
}

export async function loadClientDistributions(
  id: string,
  vaultId?: string | null,
): Promise<Availability<readonly AdminClientDistribution[]>> {
  const res = await fetchClientDistributions(id, vaultId)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.distributions : undefined,
    `/api/v1/admin/clients/${id}/distributions`,
  )
}

export async function loadClientMovements(
  id: string,
  vaultId?: string | null,
): Promise<Availability<readonly AdminClientMovement[]>> {
  const res = await fetchClientMovements(id, vaultId)
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.movements : undefined,
    `/api/v1/admin/clients/${id}/movements`,
  )
}

/** Registre des vaults dédiés — un par client, avec son échéance de blocage. */
export async function loadAdminVaultRegistry(): Promise<Availability<readonly AdminVaultRecord[]>> {
  const res = await fetchVaultRegistry()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.vaults : undefined,
    '/api/v1/admin/vaults/registry',
  )
}

/** L'AUM total dans le temps, un point par jour (90 jours). */
export async function loadAdminAumHistory(): Promise<Availability<readonly AdminAumSnapshot[]>> {
  const res = await fetchAumHistory()
  return fromBackendOrUnavailable(res, res.ok ? res.data.snapshots : undefined, '/api/v1/vault/history')
}

/** Les distributions mensuelles du minage. */
export async function loadAdminMiningDistributions(): Promise<
  Availability<readonly AdminMiningDistribution[]>
> {
  const res = await fetchMiningDistributions()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.distributions : undefined,
    '/api/v1/mining/distributions',
  )
}

/** Bilan de la réserve bitcoin : produit, retenu, vendu. */
export async function loadAdminBtcReserve(): Promise<Availability<AdminBtcReserve>> {
  const res = await fetchBtcReserve()
  return fromBackendOrUnavailable(
    res,
    res.ok ? res.data.reserve : undefined,
    '/api/v1/admin/btc-reserve',
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
