/**
 * Ligne de la file « À traiter » : chaque ligne nomme sa propre résolution
 * (une exception sans action est une plainte, pas un élément de travail).
 *
 * Type consommé par `ActionQueue` (`components/admin/dashboard/action-queue.tsx`)
 * et produit par `buildPriorityQueue` (`lib/vaults/pilotage.ts`). L'ancien
 * composant de rendu `PriorityQueue` a été retiré : aucun consommateur
 * (HC-AUDIT P2-22).
 */
export type PriorityQueueRow = Readonly<{
  id: string
  kind: string
  clientLabel: string
  status: string
  ageLabel: string
  severity: 'critique' | 'important' | 'information'
  actionHref: string
  actionLabel: string
}>
