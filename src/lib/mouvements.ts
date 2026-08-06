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
  Deposit: 'Dépôt',
  Redeem: 'Rachat',
  StrategyAdded: 'Stratégie ajoutée',
  StrategyRemoved: 'Stratégie retirée',
  Rebalance: 'Rééquilibrage',
  VaultSwapped: 'Échange de coffre',
  ElectricityPaid: 'Électricité payée',
  ElecPayeeUpdated: 'Bénéficiaire électricité mis à jour',
  MonthlyElecCostUpdated: 'Coût mensuel d’électricité mis à jour',
  MiningMetricsReported: 'Métriques de minage transmises',
  CurtailmentTriggered: 'Délestage déclenché',
  CurtailmentLifted: 'Délestage levé',
  TakeProfitExecuted: 'Prise de profit exécutée',
  MonthlyEngineRun: 'Cycle mensuel exécuté',
}

/** Full sentence: for an event feed that reads like a narrative. */
const PHRASE_MOUVEMENT: Record<string, string> = {
  Deposit: 'Un dépôt a été enregistré',
  Redeem: 'Un rachat a été enregistré',
  StrategyAdded: 'Une stratégie a été ajoutée au coffre',
  StrategyRemoved: 'Une stratégie a été retirée du coffre',
  Rebalance: 'Le coffre a été rééquilibré',
  VaultSwapped: 'Un échange a été exécuté dans le coffre',
  ElectricityPaid: 'L’électricité a été payée',
  ElecPayeeUpdated: 'Le bénéficiaire de l’électricité a été mis à jour',
  MonthlyElecCostUpdated: 'Le coût mensuel d’électricité a été mis à jour',
  MiningMetricsReported: 'Les métriques de minage ont été transmises',
  CurtailmentTriggered: 'Le délestage de la flotte a été déclenché',
  CurtailmentLifted: 'Le délestage de la flotte a été levé',
  TakeProfitExecuted: 'Une prise de profit a été exécutée',
  MonthlyEngineRun: 'Le cycle mensuel a été exécuté',
}

export const libelleMouvement = (nom: string): string => LIBELLE_MOUVEMENT[nom] ?? nom
export const phraseMouvement = (nom: string): string => PHRASE_MOUVEMENT[nom] ?? libelleMouvement(nom)

/**
 * Les codes de motif du service, rendus en phrase lisible.
 *
 * La console est en français : cette table traduit, elle ne recopie pas. Les
 * CLÉS restent les codes bruts du backend — ce sont des identifiants, pas du
 * texte d'interface, et les changer casserait la correspondance.
 *
 * Un motif inconnu rend `undefined` : mieux vaut ne rien dire que laisser
 * fuir un code technique dans une console métier.
 */
const MOTIF_LISIBLE: Record<string, string> = {
  no_investor_record: 'aucun dossier investisseur n’est rattaché à ce compte',
  engine_not_initialised: 'le moteur de minage n’a pas encore été initialisé',
  dynavault_not_deployed: 'cette fonction n’est pas encore ouverte',
  // Le contrat répond mais n'expose aucune lecture pour cette donnée : c'est
  // une capacité absente de la source, pas un déploiement en attente.
  not_exposed_by_contract: 'le contrat n’expose aucune lecture pour cette donnée',
  no_custody_provider_integrated: 'aucun prestataire de conservation n’est intégré',
  no_events_indexed: 'aucun mouvement n’a encore été indexé',
  no_runs_recorded: 'aucun backtest n’a encore été exécuté',
  db_error: 'la base de données n’a pas répondu',
  rpc_error: 'la chaîne n’a pas répondu',
  not_available: 'la donnée n’est pas disponible',
  // Parts de poches — motifs du registre vault (partDeployeeBps).
  some_pocket_shares_unreadable:
    'une partie des poches du coffre n’a pas pu être lue — le capital déployé ne peut pas être calculé',
  no_pocket_share_readable: 'aucune poche du coffre n’a pu être lue',
  no_readable_pocket_drift: 'aucune dérive de poche n’est lisible',
  vaults_use_different_denominations: 'les coffres n’utilisent pas la même devise',
  no_deployed_capital: 'aucun capital déployé n’est mesurable',
}

export function motifLisible(motif: string | null | undefined): string | undefined {
  if (typeof motif !== 'string' || motif === '') return undefined
  return MOTIF_LISIBLE[motif]
}

/**
 * Présentation FR de l'état d'une source, pour le panneau « Activité des
 * sources » que cinq pages affichent.
 *
 * Le code TECHNIQUE est inchangé — il vient du backend et reste la valeur qui
 * circule. Seule la présentation est traduite : les pages rendaient
 * `source.status.toLowerCase()`, donc « unavailable », « live », « partial »
 * en clair dans une console française. Relevé sur la capture desktop de
 * /admin/vaults : cinq lignes « unavailable » et une « live ».
 *
 * Un code inconnu retombe sur lui-même plutôt que sur une phrase inventée :
 * mieux vaut un code brut visible qu'un état requalifié à tort.
 */
const ETAT_SOURCE_LISIBLE: Record<string, string> = {
  LIVE: 'en direct',
  EMPTY: 'aucune donnée',
  PARTIAL: 'partiel',
  NOT_EXPOSED: 'non exposé',
  NOT_CONFIGURED: 'non configuré',
  NOT_SUPPORTED: 'non pris en charge',
  PERMISSION_DENIED: 'accès refusé',
  STALE: 'obsolète',
  SIMULATED: 'simulé (backend)',
  ERROR: 'erreur',
  UNAVAILABLE: 'indisponible',
}

export function etatSourceLisible(etat: string | null | undefined): string {
  if (typeof etat !== 'string' || etat === '') return '—'
  return ETAT_SOURCE_LISIBLE[etat.toUpperCase()] ?? etat.toLowerCase()
}

/** USDC at six decimals — a thin wrapper over the shared formatter. */
export function montantUsdc(atomique: string | null | undefined, decimales = 2): string {
  return formatCurrency(atomique, { decimals: decimales })
}

