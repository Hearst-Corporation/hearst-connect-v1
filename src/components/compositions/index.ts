/**
 * Hearst Connect compositions — level 2 of the doctrine.
 *
 * They assemble the primitives (Catalyst, and the console's own material) into
 * reusable layout contracts. They do not reimplement any of Catalyst's
 * accessible behavior, and contain no business logic.
 *
 * A composition only belongs here if it carries a real contract — structure,
 * accessibility, or data state. A wrapper that merely forwards its props has no
 * place here: it would add a name without adding a guarantee.
 */

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
  DataTableShell,
  tableCol,
  Callout,
  type TableColRole,
  type DeltaTone,
  type CalloutTone,
} from '@/components/compositions/blocks'
export { FadeIn } from '@/components/compositions/motion'
