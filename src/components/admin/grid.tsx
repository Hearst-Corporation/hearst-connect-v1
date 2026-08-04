import { gridGap } from '@/lib/layout-tokens'
import clsx from 'clsx'

/**
 * The 12-column application grid.
 *
 * Two rules, and they are the whole point of this file:
 *
 * 1. **A block never stretches to "whatever is left".** It declares a span.
 *    Auto-placement is what produced the stranded half-rows the visual review
 *    rejected — two cards marooned on the left of an empty row is the grid
 *    filling tracks nobody chose.
 *
 * 2. **Spans are written as literal class strings.** Tailwind scans source
 *    text; a class built by concatenation (`lg:col-span-${n}`) is never
 *    emitted. The lookup tables below exist for that reason and must stay
 *    exhaustive.
 */

const LG_SPAN = {
  1: '@[60rem]:col-span-1',
  2: '@[60rem]:col-span-2',
  3: '@[60rem]:col-span-3',
  4: '@[60rem]:col-span-4',
  5: '@[60rem]:col-span-5',
  6: '@[60rem]:col-span-6',
  7: '@[60rem]:col-span-7',
  8: '@[60rem]:col-span-8',
  9: '@[60rem]:col-span-9',
  10: '@[60rem]:col-span-10',
  11: '@[60rem]:col-span-11',
  12: '@[60rem]:col-span-12',
} as const

const MD_SPAN = {
  1: '@[34rem]:col-span-1',
  2: '@[34rem]:col-span-2',
  3: '@[34rem]:col-span-3',
  4: '@[34rem]:col-span-4',
  5: '@[34rem]:col-span-5',
  6: '@[34rem]:col-span-6',
  7: '@[34rem]:col-span-7',
  8: '@[34rem]:col-span-8',
} as const

const BASE_SPAN = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
} as const

export type LgSpan = keyof typeof LG_SPAN
export type MdSpan = keyof typeof MD_SPAN
export type BaseSpan = keyof typeof BASE_SPAN

/**
 * A 12-column row (4 columns below `md`, 8 below `lg`).
 *
 * `as="ul"` / `as="dl"` exist so a list of tiles stays a list for assistive
 * technology instead of becoming an anonymous stack of divs.
 */
export function AdminGrid({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: Readonly<{
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'ul' | 'dl' | 'nav'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag
      {...rest}
      className={clsx(
        // `items-start` is the default on purpose. Grid items stretch to the
        // tallest row-mate unless told otherwise, and that is exactly how a
        // card holding four lines ends up 200px tall next to a long list —
        // "a giant card with tiny content", in the reviewer's words. Every
        // card now ends where its content ends. A caller that genuinely wants
        // two cards to share a baseline can pass `items-stretch`.
        /*
         * ── La grille mesure son CONTENEUR, pas la fenêtre ──────────────────
         *
         * Elle utilisait `md:` / `xl:`, des paliers de VIEWPORT, alors qu'elle
         * est presque toujours imbriquée dans une colonne dont la largeur
         * dépend du rail (200 px) et de la colonne latérale (290 px). Mesuré
         * sur /admin/administration/produit : à 1280 px de fenêtre, la grille
         * ouvrait 12 colonnes dans un conteneur de 748 px — une piste de 37 px,
         * et un titre de graphique rendu sur 4 lignes dans 171 px.
         *
         * Un premier correctif avait déplacé le palier de `lg` à `xl`. Il a
         * soigné le cas 1024 et laissé revenir le même défaut à 1280 : aucune
         * valeur de viewport ne peut décrire une largeur de conteneur. D'où
         * `@container`, la technique que `.mainRow` emploie déjà.
         *
         * Les seuils : 4 colonnes par défaut, 8 à partir de 34rem de conteneur,
         * 12 à partir de 60rem — mesurés pour qu'une piste reste lisible.
         */
        '@container grid grid-cols-4 items-start @[34rem]:grid-cols-8 @[60rem]:grid-cols-12',
        gridGap,
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/**
 * One deliberate column span inside `AdminGrid`.
 *
 * `span` is the lg (12-column) value; `md` and `base` default to full width,
 * which is what a narrow viewport almost always wants.
 */
export function AdminCol({
  span,
  md,
  base = 4,
  children,
  className,
  as: Tag = 'div',
  ...rest
}: Readonly<{
  span: LgSpan
  md?: MdSpan
  base?: BaseSpan
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li' | 'aside'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag
      {...rest}
      className={clsx(
        className,
        'min-w-0',
        BASE_SPAN[base],
        MD_SPAN[md ?? 8],
        LG_SPAN[span],
      )}
    >
      {children}
    </Tag>
  )
}

/* ── Metric grid ──────────────────────────────────────────────────────────── */

/**
 * A grid of equal tiles that is **always balanced** — no arbitrary empty half
 * at the end of the last row.
 *
 * Counts that divide cleanly (2, 3, 4, 6, 8, 9, 12…) get a fixed column count.
 * Everything else (5, 7, 11…) falls back to `auto-fit`: empty tracks collapse,
 * so the surviving tiles stretch and fill the row exactly. Either way the last
 * row is full.
 */
const FIXED_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  8: 'grid-cols-2 lg:grid-cols-4',
  9: 'grid-cols-1 sm:grid-cols-3',
  12: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

/** Columns that leave no orphan for a given count, widest first. */
function balancedColumns(count: number): string {
  const exact = FIXED_COLS[count]
  if (exact !== undefined) return exact
  for (const c of [4, 3, 2] as const) {
    if (count % c === 0) return FIXED_COLS[c] ?? 'grid-cols-1'
  }
  // 5, 7, 11 … — auto-fit collapses the unused track and the rest stretch,
  // so the last row still ends flush instead of trailing an empty half.
  return 'grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]'
}

export function AdminMetricGrid({
  count,
  children,
  className,
  as: Tag = 'div',
}: Readonly<{
  /** Number of tiles rendered as children — drives the balanced column count. */
  count: number
  children: React.ReactNode
  className?: string
  as?: 'div' | 'dl' | 'ul'
}>) {
  return <Tag className={clsx(className, 'grid gap-4', balancedColumns(count))}>{children}</Tag>
}

/* ── Named recipes ────────────────────────────────────────────────────────── */

/**
 * Chart 8 / interpretation 4 — the canonical "data and chart split".
 * Declared once so every page that needs it reads identically.
 */
export function AdminChartSplit({
  chart,
  aside,
  className,
}: Readonly<{ chart: React.ReactNode; aside: React.ReactNode; className?: string }>) {
  return (
    <AdminGrid className={className}>
      <AdminCol span={8}>{chart}</AdminCol>
      <AdminCol span={4} as="aside">
        {aside}
      </AdminCol>
    </AdminGrid>
  )
}

/**
 * Table page — a full-width toolbar and table, with a deliberate secondary
 * column for the summary rather than a panel floating wherever it lands.
 */
export function AdminTableSplit({
  main,
  aside,
  className,
}: Readonly<{ main: React.ReactNode; aside?: React.ReactNode; className?: string }>) {
  if (aside === undefined) return <div className={clsx(className, 'min-w-0')}>{main}</div>
  return (
    <AdminGrid className={className}>
      <AdminCol span={8}>{main}</AdminCol>
      <AdminCol span={4} as="aside">
        {aside}
      </AdminCol>
    </AdminGrid>
  )
}
