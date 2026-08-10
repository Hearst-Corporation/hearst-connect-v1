import { formatCurrency } from '@/lib/format'
export { formatAddress as adresseCourte, formatDateTime as dateLisible, formatRelativeTime as ilYA } from '@/lib/format'

/**
 * Chain movement vocabulary, in English.
 *
 * The service names its movements in technical English (`MonthlyElecCostUpdated`).
 * No one in a business console should have to read that. This module holds
 * the dictionary — a short name for a list, a full sentence for a
 * chronological feed — plus the handful of formatters that go with it.
 *
 * Two rules govern the formatters: a missing value renders '—', never a
 * zero; an unknown movement name is not invented, it's rendered as-is
 * rather than approximately translated.
 */

/** Short name: for a column, a distribution bar, a chip. */
export const MOVEMENT_LABEL: Record<string, string> = {
  Deposit: 'Deposit',
  Redeem: 'Redemption',
  StrategyAdded: 'Strategy added',
  StrategyRemoved: 'Strategy removed',
  Rebalance: 'Rebalance',
  VaultSwapped: 'Vault swap',
  ElectricityPaid: 'Electricity paid',
  ElecPayeeUpdated: 'Electricity payee updated',
  MonthlyElecCostUpdated: 'Monthly electricity cost updated',
  MiningMetricsReported: 'Mining metrics reported',
  CurtailmentTriggered: 'Curtailment triggered',
  CurtailmentLifted: 'Curtailment lifted',
  TakeProfitExecuted: 'Take profit executed',
  MonthlyEngineRun: 'Monthly cycle executed',
}

/** Full sentence: for an event feed that reads like a narrative. */
const MOVEMENT_SENTENCE: Record<string, string> = {
  Deposit: 'A deposit was recorded',
  Redeem: 'A redemption was recorded',
  StrategyAdded: 'A strategy was added to the vault',
  StrategyRemoved: 'A strategy was removed from the vault',
  Rebalance: 'The vault was rebalanced',
  VaultSwapped: 'A swap was executed in the vault',
  ElectricityPaid: 'Electricity was paid',
  ElecPayeeUpdated: 'The electricity payee was updated',
  MonthlyElecCostUpdated: 'The monthly electricity cost was updated',
  MiningMetricsReported: 'Mining metrics were reported',
  CurtailmentTriggered: 'Fleet curtailment was triggered',
  CurtailmentLifted: 'Fleet curtailment was lifted',
  TakeProfitExecuted: 'A take profit was executed',
  MonthlyEngineRun: 'The monthly cycle was executed',
}

export const movementLabel = (name: string): string => MOVEMENT_LABEL[name] ?? name
export const movementSentence = (name: string): string => MOVEMENT_SENTENCE[name] ?? movementLabel(name)

/**
 * Service reason codes, rendered as readable phrases.
 *
 * KEYS remain raw backend codes — identifiers, not UI text. Changing them
 * would break the mapping.
 *
 * An unknown reason returns `undefined`: better to say nothing than leak a
 * technical code into a business console.
 */
const READABLE_REASON: Record<string, string> = {
  no_investor_record: 'no investor record is linked to this account',
  engine_not_initialised: 'the mining engine has not been initialized yet',
  dynavault_not_deployed: 'this feature is not open yet',
  // The contract responds but exposes no read for this data: a missing
  // capability on the source, not a pending deployment.
  not_exposed_by_contract: 'the contract exposes no read for this data',
  no_custody_provider_integrated: 'no custody provider is integrated',
  no_events_indexed: 'no movements have been indexed yet',
  no_runs_recorded: 'no backtest has been run yet',
  db_error: 'the database did not respond',
  rpc_error: 'the chain did not respond',
  not_available: 'the data is not available',
  // Pocket shares — vault registry reasons (partDeployeeBps).
  some_pocket_shares_unreadable:
    'some vault pockets could not be read — deployed capital cannot be calculated',
  no_pocket_share_readable: 'no vault pocket could be read',
  no_readable_pocket_drift: 'no pocket drift is readable',
  vaults_use_different_denominations: 'the vaults do not use the same currency',
  no_deployed_capital: 'no deployed capital is measurable',
}

export function readableReason(reason: string | null | undefined): string | undefined {
  if (typeof reason !== 'string' || reason === '') return undefined
  return READABLE_REASON[reason]
}

/**
 * English presentation of a source state, for the "Source activity" panel
 * shown on five pages.
 *
 * The TECHNICAL code is unchanged — it comes from the backend. Only presentation
 * is translated. An UNKNOWN code (present but off-table) renders as-is,
 * lowercased — never requalified or masked as "—". Only a real absence
 * (null / empty) renders "—".
 */
const READABLE_SOURCE_STATE: Record<string, string> = {
  LIVE: 'live',
  EMPTY: 'no data',
  PARTIAL: 'partial',
  RUNNING: 'running',
  NOT_REPORTED: 'not reported',
  NOT_EXPOSED: 'not exposed',
  NOT_CONFIGURED: 'not configured',
  NOT_SUPPORTED: 'not supported',
  PERMISSION_DENIED: 'access denied',
  STALE: 'stale',
  SIMULATED: 'simulated (backend)',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
}

export function readableSourceState(state: string | null | undefined): string {
  if (typeof state !== 'string' || state === '') return '—'
  return READABLE_SOURCE_STATE[state.toUpperCase()] ?? state.toLowerCase()
}

/**
 * Capitalized variant: same translation, first letter uppercased, for sentence
 * starts or standalone badges. `readableSourceState` remains the source of truth.
 * The absence "—" is not capitalized.
 */
export function readableSourceStateCap(state: string | null | undefined): string {
  const label = readableSourceState(state)
  if (label === '—') return label
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** USDC at six decimals — a thin wrapper over the shared formatter. */
export function usdcAmount(atomic: string | null | undefined, decimals = 2): string {
  return formatCurrency(atomic, { decimals: decimals })
}
