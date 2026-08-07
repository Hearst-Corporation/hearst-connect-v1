/**
 * Libellés FR partagés pour les statuts métier — util pur, sans état ni I/O.
 *
 * Deux familles vivent ici : les statuts de déploiement (souscriptions /
 * demandes on-chain) et les statuts / étapes de conformité KYC. Plusieurs pages
 * les importent ; les exports nommés doivent donc rester STABLES.
 *
 * Deux règles, comme dans `mouvements.ts` (`etatSourceLisible`) :
 *  - les CLÉS sont les codes bruts du backend (identifiants, jamais du texte
 *    d'interface) — on ne les traduit pas, on les mappe ;
 *  - un code INCONNU (présent mais hors table) se rend tel quel, en minuscules,
 *    jamais masqué en « — » : un état inconnu n'est pas une absence, le
 *    requalifier affirmerait ce que le service n'a pas dit. Seule une entrée
 *    absente (null / vide) rend « — ».
 *
 * Ce module est un pur util : `import 'server-only'` n'est pas requis.
 */

/** Normalise une entrée backend en clé de dictionnaire, ou '' si vide/absente. */
function cle(code: string | null | undefined): string {
  if (typeof code !== 'string') return ''
  return code.trim().toUpperCase()
}

/**
 * Statut d'un déploiement / d'une demande de souscription.
 *
 * Codes confirmés côté produit : REQUESTED, PENDING, CONFIRMED, FAILED.
 */
const STATUT_DEPLOIEMENT: Record<string, string> = {
  REQUESTED: 'Demandée',
  PENDING: 'En cours',
  CONFIRMED: 'Confirmée',
  FAILED: 'Échouée',
}

export function libelleStatutDeploiement(code: string | null | undefined): string {
  const k = cle(code)
  if (k === '') return '—'
  return STATUT_DEPLOIEMENT[k] ?? k.toLowerCase()
}

/**
 * Statut global d'une vérification KYC.
 *
 * ⚠️ La liste EXACTE des codes renvoyés par /api/v1/compliance est à confirmer
 * côté backend. On mappe ici les codes PLAUSIBLES (majuscules) sans inventer de
 * valeur : un code hors table présent se rend tel quel (en minuscules), « — »
 * n'est réservé qu'à une absence réelle.
 */
const STATUT_KYC: Record<string, string> = {
  PENDING: 'En attente',
  EN_ATTENTE: 'En attente',
  IN_REVIEW: 'En cours d’examen',
  IN_PROGRESS: 'En cours d’examen',
  APPROVED: 'Approuvée',
  VERIFIED: 'Vérifiée',
  REJECTED: 'Rejetée',
  DENIED: 'Rejetée',
  EXPIRED: 'Expirée',
  HIGH_RISK: 'Risque élevé',
  DONE: 'Terminée',
}

export function libelleKyc(code: string | null | undefined): string {
  const k = cle(code)
  if (k === '') return '—'
  return STATUT_KYC[k] ?? k.toLowerCase()
}

/**
 * Étape d'un parcours KYC (une brique du dossier plutôt que le verdict global).
 *
 * ⚠️ Même réserve : les codes /api/v1/compliance sont à confirmer côté backend.
 * Codes plausibles mappés sans invention ; un code inconnu présent se rend tel
 * quel (en minuscules), « — » seulement pour une absence.
 */
const ETAPE_KYC: Record<string, string> = {
  NOT_STARTED: 'Non commencée',
  PENDING: 'En attente',
  EN_ATTENTE: 'En attente',
  SUBMITTED: 'Soumise',
  IN_REVIEW: 'En cours d’examen',
  IN_PROGRESS: 'En cours',
  APPROVED: 'Validée',
  REJECTED: 'Rejetée',
  EXPIRED: 'Expirée',
  HIGH_RISK: 'Risque élevé',
  DONE: 'Terminée',
}

export function libelleEtape(code: string | null | undefined): string {
  const k = cle(code)
  if (k === '') return '—'
  return ETAPE_KYC[k] ?? k.toLowerCase()
}
