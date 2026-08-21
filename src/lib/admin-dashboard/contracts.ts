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
