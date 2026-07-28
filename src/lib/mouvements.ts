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
export const LIBELLE_MOUVEMENT: Record<string, string> = {
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
  TakeProfitExecuted: 'Take-profit executed',
  MonthlyEngineRun: 'Monthly cycle run',
}

/** Full sentence: for an event feed that reads like a narrative. */
export const PHRASE_MOUVEMENT: Record<string, string> = {
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
  TakeProfitExecuted: 'A take-profit was executed',
  MonthlyEngineRun: 'The monthly cycle was run',
}

export const libelleMouvement = (nom: string): string => LIBELLE_MOUVEMENT[nom] ?? nom
export const phraseMouvement = (nom: string): string => PHRASE_MOUVEMENT[nom] ?? libelleMouvement(nom)

/**
 * The service's machine reason codes, in English.
 *
 * An unknown reason renders `undefined`: better to say nothing than to leak
 * a technical code into a business console.
 */
export const MOTIF_LISIBLE: Record<string, string> = {
  no_investor_record: 'no investor record is attached to this account',
  engine_not_initialised: 'the mining engine has not been initialized yet',
  dynavault_not_deployed: 'this feature is not open yet',
  // The contract is reachable but exposes no read for this data: it's a
  // capability missing from the source, not a pending deployment.
  not_exposed_by_contract: 'the contract exposes no read for this data',
  no_custody_provider_integrated: 'no custody provider is integrated yet',
  no_events_indexed: 'no movement has been indexed yet',
  no_runs_recorded: 'no backtest has been run yet',
  db_error: 'the database did not respond',
  rpc_error: 'the chain did not respond',
  not_available: 'the data is not available',
}

export function motifLisible(motif: string | null | undefined): string | undefined {
  if (typeof motif !== 'string' || motif === '') return undefined
  return MOTIF_LISIBLE[motif]
}

/** USDC at six decimals — a thin wrapper over the shared formatter. */
export function montantUsdc(atomique: string | null | undefined, decimales = 2): string {
  return formatCurrency(atomique, { decimals: decimales })
}

