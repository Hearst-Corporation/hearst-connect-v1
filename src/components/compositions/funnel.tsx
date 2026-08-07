import { type Availability } from '@/lib/vaults/model'

/**
 * Vue d'une étape du parcours de souscription (funnel) : chaque étape porte son
 * compteur, son sous-compteur « en attente » et la route qui la résout.
 *
 * Type consommé par le stepper `SubscriptionJourneyStepper`
 * (`components/admin/dashboard/subscription-journey.tsx`). L'ancien composant de
 * rendu `FunnelPipeline` a été retiré : aucun consommateur (HC-AUDIT P2-22).
 */
export type FunnelStepView = Readonly<{
  id: string
  label: string
  count: Availability<string>
  pending: Availability<string>
  actionHref: string
  actionLabel: string
  sourceNote: string
}>
