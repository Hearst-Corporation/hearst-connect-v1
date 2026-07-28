import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Garde de statut d'affichage.
 *
 * Le backend expose certains statuts en champ libre (`string`). Les composants
 * d'affichage (`StatusBadge`, `AdminStatus`) indexent en revanche des
 * dictionnaires fermés sur `ResolvedStatus | 'SNAPSHOT'` : une valeur hors
 * dictionnaire y produit une classe de couleur `undefined` et le libellé
 * littéral « undefined » à l'écran. Ce module ferme ce trou en validant la
 * chaîne reçue au lieu de la forcer par un cast.
 */

export type StatutAffichage = ResolvedStatus | 'SNAPSHOT'

/**
 * Table exhaustive des statuts affichables.
 *
 * Le type `Record<StatutAffichage, true>` oblige TypeScript à signaler tout
 * membre manquant : si `ResolvedStatus` gagne demain une valeur, la compilation
 * échoue ici plutôt que de dériver silencieusement. Un simple tableau de
 * chaînes n'offrirait pas cette garantie.
 */
const STATUTS_AFFICHABLES: Record<StatutAffichage, true> = {
  LIVE: true,
  SNAPSHOT: true,
  STALE: true,
  PARTIAL: true,
  EMPTY: true,
  SIMULATED: true,
  NOT_CONFIGURED: true,
  UNAVAILABLE: true,
  NOT_SUPPORTED: true,
  PERMISSION_DENIED: true,
  ERROR: true,
}

/**
 * Repli pour une valeur que nous ne savons pas interpréter.
 *
 * `UNAVAILABLE` et non `LIVE` : afficher « Live » sur un statut incompris
 * reviendrait à certifier une fraîcheur que rien n'établit. Le choix reprend
 * celui de `statusFromMeta` (`src/lib/backend/client.ts`), dont le `default`
 * retombe déjà sur `UNAVAILABLE` — même maison, même repli.
 */
const STATUT_INCONNU: StatutAffichage = 'UNAVAILABLE'

/** Vrai si la chaîne est exactement l'un des statuts affichables. */
export function estStatutAffichage(valeur: string): valeur is StatutAffichage {
  return Object.hasOwn(STATUTS_AFFICHABLES, valeur)
}

/**
 * Rend un statut sûr à partir d'une chaîne backend.
 *
 * Une absence (`null`/`undefined`) et une valeur inconnue sont traitées
 * identiquement : dans les deux cas, nous n'avons pas d'état lisible à
 * annoncer.
 */
export function statutAffichage(valeur: string | null | undefined): StatutAffichage {
  if (valeur === null || valeur === undefined) return STATUT_INCONNU
  return estStatutAffichage(valeur) ? valeur : STATUT_INCONNU
}
