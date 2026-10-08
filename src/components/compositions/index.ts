/** Layout and panel compositions for admin surfaces. */

export { Panel, PanelBody, PanelHeader, type PanelTone } from '@/components/compositions/panel'
export { CalmState, SourceAttendue } from '@/components/compositions/empty-state'

/*
 * "Premium" blocks (level 2bis) — ready-to-use surfaces composed from the
 * primitives above. The entrance motion lives in `motion.tsx` (`FadeIn`), the
 * only client fragment; the blocks remain server-rendered.
 */
export {
  StatCard,
  StatGrid,
  SectionCard,
  SectionHeader,
  DataTableShell,
  AdminTable,
  tableCol,
  Callout,
  type TableColRole,
  type DeltaTone,
  type CalloutTone,
} from '@/components/compositions/blocks'
export { FadeIn } from '@/components/compositions/motion'
