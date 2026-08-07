/**
 * Compositions Hearst Connect — niveau 2 de la doctrine.
 *
 * Elles assemblent les primitives (Catalyst, et la matière de la console) en
 * contrats de mise en page réutilisables. Elles ne réimplémentent aucun
 * comportement accessible de Catalyst, et ne contiennent aucune logique métier.
 *
 * Une composition n'entre ici que si elle porte un contrat réel — structure,
 * accessibilité, ou état de données. Un wrapper qui ne fait que passer ses
 * props n'a pas sa place : il ajouterait un nom sans ajouter de garantie.
 */

export { Panel, PanelBody, PanelHeader, type PanelTone } from '@/components/compositions/panel'
export { KpiRow, MetricCard, MetricValue, SideFact } from '@/components/compositions/metric'
export { CalmState, SourceAttendue } from '@/components/compositions/empty-state'

/*
 * Blocs « haut de gamme » (niveau 2bis) — surfaces prêtes à l'emploi composées
 * des primitives ci-dessus. Le mouvement d'entrée vit dans `motion.tsx`
 * (`FadeIn`), le seul fragment client ; les blocs restent rendus côté serveur.
 */
export {
  StatCard,
  StatGrid,
  SectionCard,
  DataTableShell,
  Callout,
  type DeltaTone,
  type CalloutTone,
} from '@/components/compositions/blocks'
export { FadeIn } from '@/components/compositions/motion'
export { type FunnelStepView } from '@/components/compositions/funnel'
export { type PriorityQueueRow } from '@/components/compositions/priority-queue'
