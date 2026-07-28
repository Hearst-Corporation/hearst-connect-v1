/**
 * Vocabulaire des mouvements de la chaîne, dit en français.
 *
 * Le service nomme ses mouvements en anglais technique (`MonthlyElecCostUpdated`).
 * Personne dans une console métier n'a à lire ça. Ce module tient le
 * dictionnaire — court nom pour une liste, phrase complète pour un fil
 * chronologique — et les quelques formatages qui vont avec.
 *
 * Deux règles gouvernent les formateurs : une valeur absente rend « — », jamais
 * un zéro ; un nom de mouvement inconnu n'est pas inventé, il est rendu tel
 * quel plutôt que traduit approximativement.
 */

/** Nom court : pour une colonne, une barre de répartition, une puce. */
export const LIBELLE_MOUVEMENT: Record<string, string> = {
  Deposit: 'Dépôt',
  Redeem: 'Rachat',
  StrategyAdded: 'Stratégie ajoutée',
  StrategyRemoved: 'Stratégie retirée',
  Rebalance: 'Rééquilibrage',
  VaultSwapped: 'Échange de portefeuille',
  ElectricityPaid: 'Électricité réglée',
  ElecPayeeUpdated: 'Bénéficiaire électricité modifié',
  MonthlyElecCostUpdated: 'Coût mensuel d’électricité mis à jour',
  MiningMetricsReported: 'Relevé de minage transmis',
  CurtailmentTriggered: 'Bridage déclenché',
  CurtailmentLifted: 'Bridage levé',
  TakeProfitExecuted: 'Prise de bénéfice exécutée',
  MonthlyEngineRun: 'Cycle mensuel exécuté',
}

/** Phrase complète : pour un fil d'événements qui se lit comme un récit. */
export const PHRASE_MOUVEMENT: Record<string, string> = {
  Deposit: 'Un dépôt a été enregistré',
  Redeem: 'Un rachat a été enregistré',
  StrategyAdded: 'Une stratégie a été ajoutée au portefeuille',
  StrategyRemoved: 'Une stratégie a été retirée du portefeuille',
  Rebalance: 'Le portefeuille a été rééquilibré',
  VaultSwapped: 'Un échange a été réalisé dans le portefeuille',
  ElectricityPaid: 'L’électricité a été réglée',
  ElecPayeeUpdated: 'Le bénéficiaire de l’électricité a été modifié',
  MonthlyElecCostUpdated: 'Le coût mensuel d’électricité a été mis à jour',
  MiningMetricsReported: 'Un relevé de minage a été transmis',
  CurtailmentTriggered: 'Le bridage de la flotte a été déclenché',
  CurtailmentLifted: 'Le bridage de la flotte a été levé',
  TakeProfitExecuted: 'Une prise de bénéfice a été exécutée',
  MonthlyEngineRun: 'Le cycle mensuel a été exécuté',
}

export const libelleMouvement = (nom: string): string => LIBELLE_MOUVEMENT[nom] ?? nom
export const phraseMouvement = (nom: string): string => PHRASE_MOUVEMENT[nom] ?? libelleMouvement(nom)

/**
 * Les motifs machine du service, dits en français.
 *
 * Un motif inconnu rend `undefined` : mieux vaut ne rien dire que de laisser
 * fuir un code technique dans une console métier.
 */
export const MOTIF_LISIBLE: Record<string, string> = {
  no_investor_record: 'aucun dossier investisseur n’est rattaché à ce compte',
  engine_not_initialised: 'le moteur de minage n’a pas encore été initialisé',
  dynavault_not_deployed: 'cette fonctionnalité n’est pas encore ouverte',
  // Le contrat est joignable mais n’expose aucune lecture de cette donnée :
  // c’est une capacité absente de la source, pas un déploiement en attente.
  not_exposed_by_contract: 'le contrat n’expose aucune lecture de cette donnée',
  no_custody_provider_integrated: 'aucun dépositaire n’est encore intégré',
  no_events_indexed: 'aucun mouvement n’a encore été relevé',
  no_runs_recorded: 'aucun rétro-test n’a encore été exécuté',
  db_error: 'la base de données n’a pas répondu',
  rpc_error: 'la chaîne n’a pas répondu',
  not_available: 'la donnée n’est pas disponible',
}

export function motifLisible(motif: string | null | undefined): string | undefined {
  if (typeof motif !== 'string' || motif === '') return undefined
  return MOTIF_LISIBLE[motif]
}

/** USDC à six décimales. Une valeur absente rend un tiret, jamais un zéro. */
export function montantUsdc(atomique: string | null | undefined, decimales = 2): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const brut = Number(atomique)
  if (!Number.isFinite(brut)) return '—'
  return `${(brut / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

export function dateLisible(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return 'date inconnue'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'date inconnue'
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Ancienneté relative — « il y a 3 h ». Une date illisible rend un tiret. */
export function ilYA(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const minutes = Math.round((Date.now() - t) / 60_000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.round(heures / 24)
  if (jours < 31) return `il y a ${jours} j`
  return `il y a ${Math.round(jours / 30)} mois`
}

/** Adresse de chaîne tronquée. Une absence rend `null` : à l'appelant de taire. */
export function adresseCourte(adresse: string | null | undefined): string | null {
  if (adresse === null || adresse === undefined || adresse === '') return null
  if (adresse.length < 12) return adresse
  return `${adresse.slice(0, 6)}…${adresse.slice(-4)}`
}
