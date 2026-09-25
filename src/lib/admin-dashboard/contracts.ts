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
  /**
   * Écart à la cible, en points de base, pour la poche la plus dérivée.
   * Absent tant que l'allocation réelle n'a pas été lue — une dérive qu'on
   * ne sait pas mesurer n'est pas une dérive nulle.
   */
  readonly worstDriftBps: number | null
  /**
   * Seuil au-delà duquel ce vault demande un arbitrage, en points de base.
   *
   * PAR VAULT, pas global : chaque vault est taillé pour un client, et un
   * mandat prudent ne tolère pas la même dérive qu'un mandat offensif. Un
   * seuil unique aurait alerté trop tôt sur les uns et trop tard sur les
   * autres. `DEFAULT_DRIFT_THRESHOLD_BPS` sert quand le vault n'en porte pas.
   */
  readonly driftThresholdBps: number | null
}

/**
 * Une simulation d'offre — le même moteur que la projection du client.
 *
 * `points` porte les bandes de percentiles, en dollars ET en bitcoin. La
 * lecture bitcoin est INVERSÉE à la source : un percentile haut en dollars
 * correspond à un cours bas, donc à plus de bitcoin pour le même capital.
 * L'interface ne rejoue pas cette inversion, elle trace ce qu'on lui donne.
 */
export type OfferSimulationPoint = {
  readonly month: number
  readonly label: string
  readonly p10: number
  readonly p25: number
  readonly p50: number
  readonly p75: number
  readonly p90: number
  readonly btcP10: number
  readonly btcP50: number
  readonly btcP90: number
}

export type OfferSimulation = {
  readonly runs: number
  readonly horizonMonths: number
  readonly startValueUsdc: number
  readonly startValueBtc: number
  /** Ce que le même capital achèterait au comptant aujourd'hui — la référence
   *  de la thèse : « auriez-vous plus de bitcoin en achetant simplement ? » */
  readonly hodlBtc: number
  readonly blendedYieldPct: number
  readonly btcVolAnnualPct: number
  readonly allocation: {
    readonly miningBps: number
    readonly lendingBps: number
    readonly stableBps: number
  }
  readonly points: readonly OfferSimulationPoint[]
}

/* ── La fiche d'un client ──────────────────────────────────────────────────
   Quatre read-models scopés par client. Les surfaces admin existantes étaient
   globales : elles disaient ce que faisait le portefeuille, jamais ce que
   faisait une personne — donc un chiffre montré à un client ne se recoupait
   nulle part. */

/**
 * Le vault d'un client, au complet.
 *
 * Porte les champs que le front client ne peut PAS recalculer :
 * `withdrawnUsdcAtPayout` (les dollars réellement encaissés, chaque retrait à
 * son cours) et `entryRateUsd` (le cours de la conversion à l'entrée). Le
 * client ne connaît que le cours du jour ; reconvertir un cumul de retraits au
 * spot d'aujourd'hui donnerait un montant que personne n'a touché.
 */
export type AdminClientVault = {
  readonly clientId: string
  readonly vaultId: string
  readonly label: string
  readonly principalUsdc: number | null
  readonly withdrawnUsdc: number | null
  readonly withdrawnUsdcAtPayout: number | null
  readonly entryRateUsd: number | null
  readonly availableUsdc: number | null
  readonly nextDistributionAt: string | null
  readonly lockupStartAt: string | null
  readonly lockupMonths: number | null
  readonly depositUnlocked: boolean
  readonly withdrawUnlocked: boolean
  readonly producedBtc: number | null
  readonly accruedBtc: number | null
}

/** Rendement d'une poche, en run-rate annualisé. */
export type AdminBucketYield = {
  readonly bucket: string
  readonly yieldPct: number | null
  readonly capitalUsdc: number | null
  readonly trendPct: number | null
}

/** Une distribution : versée, approuvée, ou en attente. */
export type AdminClientDistribution = {
  readonly id: string
  readonly month: string
  readonly status: string
  readonly btcAmountSats: number | null
  readonly yieldUsdc: number | null
  /** Cours retenu POUR CETTE distribution — jamais celui du jour. */
  readonly btcPriceUsdc: number | null
  readonly distributionDate: string | null
}

/** Une ligne du journal d'un client. */
export type AdminClientMovement = {
  readonly id: string
  readonly type: string
  readonly amountUsdc: number | null
  readonly occurredAt: string | null
  readonly txHash: string | null
  readonly status: string
}

/**
 * 5 points de pourcentage — le seuil retenu quand un vault n'en déclare pas.
 *
 * Il ne vaut rien en soi : c'est un point de départ, que chaque vault peut
 * relever ou abaisser selon son mandat.
 */
export const DEFAULT_DRIFT_THRESHOLD_BPS = 500

/** Le seuil effectif d'un vault : le sien, ou le défaut. */
export function driftThresholdOf(vault: AdminVaultRecord): number {
  return vault.driftThresholdBps ?? DEFAULT_DRIFT_THRESHOLD_BPS
}

/** Un vault dérive quand son écart mesuré dépasse SON seuil. */
export function isVaultDrifting(vault: AdminVaultRecord): boolean {
  if (vault.worstDriftBps === null) return false
  return Math.abs(vault.worstDriftBps) > driftThresholdOf(vault)
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
