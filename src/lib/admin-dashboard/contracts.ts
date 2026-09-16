import type { Availability } from '@/lib/vaults/model'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'

/** Named NOT_CONFIGURED — market widget keeps local shell state. */
export function isAdminNotConfigured(a: Availability<unknown>): boolean {
  return a.kind === 'unavailable' && a.status === 'NOT_CONFIGURED'
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

export type AdminRebalancingHistoryPoint = Readonly<{
  id: string
  takenAt: string
  driftBps: number
  rebalanced: boolean
  source: string
}>

export type AdminRebalancingOperationSwap = Readonly<{
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
}>

export type AdminRebalancingOperation = Readonly<{
  id: string
  blockNumber: string
  txHash: string
  logIndex: number
  occurredAt: string
  indexedAt: string
  allocations: readonly string[]
  swaps: readonly AdminRebalancingOperationSwap[]
}>

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

export type AdminDashboardData = Readonly<{
  overview: Availability<AdminPortfolioOverview>
  exposure: Availability<readonly AdminExposureStrategy[]>
  rebalancing: Availability<AdminRebalancingSummary>
  activityTimeseries: Availability<readonly AdminTimeseriesPoint[]>
  rebalancingHistory: Availability<readonly AdminRebalancingHistoryPoint[]>
  market: Availability<AdminMarketSnapshot>
  recentClients: Availability<readonly AdminRecentClient[]>
  recentActivity: Availability<readonly AdminActivityEvent[]>
}>

export type AdminOperationsSurface = Readonly<{
  rebalancing: Availability<AdminRebalancingSummary>
  recentActivity: Availability<readonly AdminActivityEvent[]>
  /** Portfolio scale used to render atomic amounts honestly (null when the overview is unavailable). */
  assetScale: AdminAssetScale | null
  /** Current portfolio exposure — target vs actual per strategy. */
  exposure: Availability<readonly AdminExposureStrategy[]>
  /** Historical drift series for the portfolio. */
  rebalancingHistory: Availability<readonly AdminRebalancingHistoryPoint[]>
  /** On-chain rebalancing operations with swap details. */
  rebalancingOperations: Availability<readonly AdminRebalancingOperation[]>
}>


/**
 * Décision en attente d'un opérateur.
 *
 * Les trois genres ne se valent pas et ne se fondent jamais : autoriser un
 * dépôt engage KYC, capacité et contrat ; approuver une distribution déclenche
 * un paiement ; traiter un retrait libère les fonds du client. Une file unique
 * obligerait l'opérateur à relire le type avant chaque geste.
 */
export type AdminApprovalKind = 'deposit' | 'distribution' | 'withdrawal'

export type AdminApproval = {
  readonly id: string
  readonly kind: AdminApprovalKind
  readonly clientId: string
  readonly clientLabel: string
  readonly vaultId: string
  readonly amountUsdc: number | null
  readonly requestedAt: string | null
  readonly note: string | null
}

/**
 * Vault dédié au registre admin. UN PAR CLIENT — jamais une quote-part d'un
 * pool. L'échéance du blocage commande la relation commerciale.
 */
export type AdminVaultRecord = {
  readonly vaultId: string
  readonly clientId: string
  readonly clientLabel: string
  readonly principalUsdc: number | null
  readonly accruedUsdc: number | null
  readonly lockupStartAt: string | null
  readonly lockupEndAt: string | null
  readonly lockupMonths: number | null
  readonly lockupElapsedMonths: number | null
  readonly depositUnlocked: boolean
  readonly status: string
}

/**
 * Bilan de la réserve bitcoin. `retainedSats` à zéro est AFFIRMÉ, pas déduit
 * d'une absence : tout le bitcoin miné est vendu pour tenir le book en dollars.
 */
export type AdminBtcReserve = {
  readonly producedSats: number | null
  readonly retainedSats: number | null
  readonly producedUsd: number | null
  readonly electricityUsd: number | null
  readonly asOf: string | null
}
