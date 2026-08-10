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
  observedAt: string
  driftBps: number
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

export type AdminAllocationPoint = Readonly<{
  at: string
  cbbtcPct: number
  usdcPct: number
  btcPriceUsdc: number
}>

export type AdminDashboardData = Readonly<{
  overview: Availability<AdminPortfolioOverview>
  exposure: Availability<readonly AdminExposureStrategy[]>
  totalAumAtomic: Availability<string>
  rebalancing: Availability<AdminRebalancingSummary>
  activityTimeseries: Availability<readonly AdminTimeseriesPoint[]>
  rebalancingHistory: Availability<readonly AdminRebalancingHistoryPoint[]>
  market: Availability<AdminMarketSnapshot>
  vaults: Availability<readonly AdminVaultSummary[]>
  vaultsTotalAum: Availability<string>
  recentClients: Availability<readonly AdminRecentClient[]>
  recentActivity: Availability<readonly AdminActivityEvent[]>
  dataHealth: Availability<readonly AdminDataHealthSource[]>
  cbbtcAllocation: Availability<readonly AdminAllocationPoint[]>
}>

export type AdminOperationsSurface = Readonly<{
  rebalancing: Availability<AdminRebalancingSummary>
  recentActivity: Availability<readonly AdminActivityEvent[]>
  /** Portfolio scale used to render atomic amounts honestly (null when the overview is unavailable). */
  assetScale: AdminAssetScale | null
}>
