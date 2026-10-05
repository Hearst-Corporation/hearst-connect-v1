import { metricValue, Reading } from '@/components/layout/console'
import type { Availability } from '@/lib/vaults/model'
import { Panel, PanelBody, panelHead, panelHint, panelTitle } from '@/components/compositions/panel'
import { SourceAttendue, CalmState } from '@/components/compositions/empty-state'
import { FadeIn } from '@/components/compositions/motion'
import { RichSparkline } from '@/components/charts'
import { Table } from '@hearst/ui/catalyst/table'
import { ResultCount } from '@hearst/ui/page'
import clsx from 'clsx'

/** Shared admin KPI and section blocks. */

/* ── StatCard / StatGrid ──────────────────────────────────────────────────── */

/**
 * The DIRECTION of a delta, decided by the caller.
 *
 * The block does not know whether "+12%" is good news: on a margin yes, on an
 * error rate no. So it is `tone` that carries the meaning (positive = mint
 * accent, negative = danger, neutral = gray), and `label` that carries the
 * already-formatted text ("+12% over 30d", "−3 incidents"). The block compares
 * nothing.
 */
export type DeltaTone = 'positive' | 'negative' | 'neutral'

const DELTA_TONE_CLASS: Record<DeltaTone, string> = {
  // The brand mint accent and danger go through their ramp tokens; the neutral
  // through the kit's secondary text gray. No hex.
  positive: 'text-(--ds-accent)',
  negative: 'text-(--ds-danger)',
  neutral: 'text-(--ds-text-subtle)',
}

const DELTA_GLYPH: Record<DeltaTone, string> = {
  positive: '▲',
  negative: '▼',
  neutral: '■',
}

/**
 * A "premium" KPI card: the title, the value (already formatted or as an
 * `Availability`), an optional delta and a sparkline slot.
 *
 * `value` accepts the two shapes the pages actually produce:
 * - an ALREADY-formatted `string`, for an editorial label or a count derived
 *   outside `Availability`;
 * - an `Availability<string>`, which then passes through `Reading` — an absence
 *   is displayed there as a named state, never as a zero.
 *
 * The title is an `h2` by default (first landmark under the shell's `h1`); the
 * caller demotes it when the card lives under an already-titled section.
 */
export function StatCard({
  title,
  value,
  delta,
  deltaTone = 'neutral',
  trend,
  hint,
  as: Tag = 'h2',
  showRoute = false,
  className,
}: Readonly<{
  title: string
  /** Already formatted, or an `Availability` that passes through `Reading`. */
  value: string | Availability<string>
  /** The delta label, ALREADY formatted by the caller ("+12% over 30d"). */
  delta?: string
  deltaTone?: DeltaTone
  /** A series for the sparkline. Rendered only if it holds ≥ 2 points. */
  trend?: number[]
  /** A sentence saying what the card measures, under the title. */
  hint?: string
  as?: 'h2' | 'h3'
  /** Shows the backend route when the value is an absence. */
  showRoute?: boolean
  className?: string
}>) {
  return (
    <Panel tone="metric" className={clsx('gap-2', className)}>
      <Tag className="text-[0.8125rem]/5 text-(--ds-text-subtle)">{title}</Tag>
      {hint !== undefined && hint !== '' && <p className={panelHint}>{hint}</p>}
      <div className="flex min-w-0 flex-auto flex-col justify-between gap-1.5 overflow-hidden">
        {typeof value === 'string' ? (
          <span className={metricValue}>{value}</span>
        ) : (
          <Reading value={value} showRoute={showRoute} />
        )}
      </div>
      {delta !== undefined && delta !== '' && (
        <p className={clsx('inline-flex items-center gap-1.5 text-xs', DELTA_TONE_CLASS[deltaTone])}>
          <span aria-hidden="true">{DELTA_GLYPH[deltaTone]}</span>
          {delta}
        </p>
      )}
      {trend && trend.length >= 2 && (
        <div className="mt-auto pt-2">
          <RichSparkline data={trend} height={24} />
        </div>
      )}
    </Panel>
  )
}

/**
 * The grid of `StatCard`s.
 *
 * `label` is MANDATORY: a row of figures with no name says nothing to whoever
 * navigates by regions. `columns` bounds the number of columns; below the
 * threshold the grid collapses on its own.
 */
export function StatGrid({
  children,
  label,
  columns = 4,
  className,
}: Readonly<{
  children: React.ReactNode
  label: string
  columns?: 2 | 3 | 4
  className?: string
}>) {
  // Container queries (not viewport breakpoints): the admin column is already
  // narrowed by the rail — forcing 4 columns on window width was crushing the cards.
  const COLS: Record<2 | 3 | 4, string> = {
    2: '@[24rem]:grid-cols-2',
    3: '@[24rem]:grid-cols-2 @[40rem]:grid-cols-3',
    4: '@[24rem]:grid-cols-2 @[48rem]:grid-cols-4',
  }
  return (
    <section aria-label={label} className={clsx('@container min-w-0', className)}>
      <div className={clsx('grid grid-cols-1 gap-3', COLS[columns])}>{children}</div>
    </section>
  )
}

/* ── SectionCard ──────────────────────────────────────────────────────────── */

/**
 * A "premium" titled surface: an optional eyebrow, the title, a context
 * sentence, an actions slot, and the body.
 *
 * It builds on `Panel` + `PanelHeader` + `PanelBody` for the substance, and
 * adds the one element those primitives lack: a soft entrance appearance
 * (`FadeIn`), which respects `prefers-reduced-motion`. This is the block that
 * the admin pages will place around each section — table, list, detail.
 *
 * `actions` lives in the header, to the right of the title: that is where an
 * export button, a filter, a "see all" link go. The block carries NO logic — it
 * exposes a slot, and the caller puts whatever it wants there.
 */
export function SectionCard({
  title,
  eyebrow,
  hint,
  actions,
  children,
  tone = 'wave',
  as: Tag = 'h2',
  className,
}: Readonly<{
  title: string
  /** The eyebrow, above the title — a category, a short context. */
  eyebrow?: string
  /** The sentence saying what the section shows. */
  hint?: string
  /** Actions slot to the right of the title (button, filter, link). */
  actions?: React.ReactNode
  children?: React.ReactNode
  tone?: 'wave' | 'chart' | 'plain'
  as?: 'h2' | 'h3'
  className?: string
}>) {
  return (
    <FadeIn>
      <Panel tone={tone} className={className}>
        <div className={panelHead}>
          <div className="min-w-0 flex-1">
            {eyebrow !== undefined && eyebrow !== '' && (
              <p className="text-xs tracking-wide text-(--ds-shell-subtle) uppercase">{eyebrow}</p>
            )}
            <Tag className={panelTitle}>{title}</Tag>
            {hint !== undefined && hint !== '' && <p className={panelHint}>{hint}</p>}
          </div>
          {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children !== undefined && <PanelBody>{children}</PanelBody>}
      </Panel>
    </FadeIn>
  )
}

/**
 * A FRAMELESS section header — eyebrow, title, context sentence, actions slot.
 *
 * `SectionCard` frames its content in a `Panel` (`surfaceBox`). When a section
 * groups children that are ALREADY framed cards (a `ChartFrame`, a
 * `DataTableShell`), wrapping them in a second `Panel` stacks a box inside a box.
 * `SectionHeader` is the answer: it carries the same title/eyebrow/hint grammar
 * without a surface, so the framed children remain the only boxes. Place it above
 * the cards inside a plain `<section>`.
 */
export function SectionHeader({
  title,
  eyebrow,
  hint,
  actions,
  as: Tag = 'h2',
  className,
}: Readonly<{
  title: string
  eyebrow?: string
  hint?: string
  actions?: React.ReactNode
  as?: 'h2' | 'h3'
  className?: string
}>) {
  return (
    <div className={clsx(panelHead, className)}>
      <div className="min-w-0 flex-1">
        {eyebrow !== undefined && eyebrow !== '' && (
          <p className="text-xs tracking-wide text-(--ds-shell-subtle) uppercase">{eyebrow}</p>
        )}
        <Tag className={panelTitle}>{title}</Tag>
        {hint !== undefined && hint !== '' && <p className={panelHint}>{hint}</p>}
      </div>
      {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ── DataTableShell ───────────────────────────────────────────────────────── */

/**
 * The "premium" wrapper around a Catalyst table.
 *
 * It carries the title, a description, an optional count, and — this is
 * its point — the routing to a named state when there is nothing to show. Two
 * distinct absences, never conflated:
 * - `source`: the source does not exist yet → `SourceAttendue` (what is
 *   missing, why, and the expected route);
 * - `calme`: the source has responded, and its response is "nothing to report" →
 *   `CalmState`.
 * When neither is supplied, the block renders the `Table` and its rows.
 *
 * The block FETCHES NO DATA: the caller decides the state from its
 * `Availability`, and passes the rows as `children`. The `count` is an
 * ALREADY-formatted label ("12 movements") — the block does not count.
 */
/**
 * Table COLUMN CONTRACT — a column expresses its semantic ROLE, not a width.
 *
 * The admin tables render an auto-layout HTML `<table>` (Catalyst) inside a
 * horizontally-scrollable shell. Columns therefore size to their content; the
 * contract's job is to make that content behave per role, and to make the same
 * role produce the SAME classes on the `TableHeader` and its `TableCell` (the
 * two used to drift — a header marked compact whose cell forgot `tabular-nums`,
 * a primary header whose cell dropped `min-w-0`).
 *
 * The geometry is intrinsic / role-derived — never a screenshot number. There is
 * no `w-[34%]`, no `flex-[1.7]`, no `--name-column`: a role never encodes a
 * percentage of a capture.
 *
 * | role      | intent                                   | classes                                     |
 * |-----------|------------------------------------------|---------------------------------------------|
 * | primary   | descriptive remainder — absorbs slack    | `min-w-0` (+ `truncate` on inner content)   |
 * | numeric   | compact figure, aligned on its units     | `whitespace-nowrap tabular-nums text-right` |
 * | status    | intrinsic badge / short state            | `whitespace-nowrap`                         |
 * | hash      | identifier — bounded, monospace, cut     | `min-w-0 truncate font-mono`                |
 * | date      | compact temporal value                   | `whitespace-nowrap tabular-nums`            |
 * | action    | trailing interactive control             | `whitespace-nowrap text-right`              |
 *
 * PRIMARY = FLEXIBLE REMAINDER, not a percentage. Atomic columns (numeric /
 * status / date / hash / action) size to their content and never steal the
 * primary's room.
 */
export type TableColRole = 'primary' | 'numeric' | 'status' | 'hash' | 'date' | 'action'

export const tableCol: Record<TableColRole, string> = {
  primary: 'min-w-0',
  numeric: 'whitespace-nowrap tabular-nums text-right',
  status: 'whitespace-nowrap',
  hash: 'min-w-0 truncate font-mono',
  date: 'whitespace-nowrap tabular-nums',
  action: 'whitespace-nowrap text-right',
}

/**
 * Product table — Catalyst overflow, shrinks to the parent track.
 * Page-width shells (DataTableShell) add the 40rem floor so columns scroll
 * instead of crushing. Nested cards must NOT set that floor or they blow
 * the grid (a 1/3 Bento track is ~23rem).
 */
export function AdminTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return <Table {...props} className={clsx('w-full min-w-0 [--gutter:0]', className)} />
}

export function DataTableShell({
  title,
  description,
  count,
  source,
  calme,
  children,
  className,
}: Readonly<{
  title: string
  description?: string
  /** An ALREADY-formatted count label, shown beside the title. Never computed here. */
  count?: string
  /** The "expected source" state to render instead of the table, if supplied. */
  source?: React.ComponentProps<typeof SourceAttendue>
  /** The "nothing to report" state (message), if supplied. */
  calme?: string
  children?: React.ReactNode
  className?: string
}>) {
  // SourceAttendue / CalmState are ALREADY framed Panels (surfaceBox). Wrapping
  // them in a SectionCard (a second surfaceBox) stacks a box inside a box — the
  // exact anti-pattern the SectionHeader docstring warns against. So in a
  // named-absence / calm state, emit a frameless SectionHeader above the single
  // framed state; only the real table keeps the SectionCard frame around it.
  if (source !== undefined || calme !== undefined) {
    return (
      <section className={clsx('flex flex-col gap-4', className)}>
        <SectionHeader
          as="h3"
          title={title}
          hint={description}
          actions={count !== undefined && count !== '' ? <ResultCount>{count}</ResultCount> : undefined}
        />
        {source !== undefined ? <SourceAttendue {...source} /> : <CalmState message={calme as string} />}
      </section>
    )
  }
  return (
    <SectionCard
      title={title}
      hint={description}
      tone="wave"
      className={className}
      actions={count !== undefined && count !== '' ? <ResultCount>{count}</ResultCount> : undefined}
    >
      <AdminTable className="[&_table]:min-w-[40rem]">{children}</AdminTable>
    </SectionCard>
  )
}

/* ── Callout ──────────────────────────────────────────────────────────────── */

/**
 * A "premium" inline note — info, warning, danger, success.
 *
 * Catalyst's `Alert` is a MODAL dialog: it interrupts. A callout, by contrast,
 * lives WITHIN the page flow, next to what it comments on. It is therefore built
 * on a tokenized `div` — each tone goes through its ramp (success, warning,
 * danger) or through the neutral graphite for info, never through a hex. The
 * background is a low-opacity fill (`/10`) and the left rule carries the full
 * hue, the visual signature of a note.
 *
 * This is NOT an absence state (see `SourceAttendue`) nor a load-error state:
 * it is an editorial remark placed alongside content that is present.
 */
export type CalloutTone = 'info' | 'success' | 'warning' | 'danger'

const CALLOUT_TONE_CLASS: Record<CalloutTone, string> = {
  // /10 fill, full left rule, text at the legible step of each ramp.
  info: 'bg-(--ds-text)/5 border-l-(--ds-shell-subtle) text-(--ds-text)',
  success: 'bg-(--ds-success)/10 border-l-(--ds-success) text-(--ds-success)',
  warning: 'bg-(--ds-warning)/10 border-l-(--ds-warning) text-(--ds-warning)',
  danger: 'bg-(--ds-danger)/10 border-l-(--ds-danger) text-(--ds-danger)',
}

const CALLOUT_ROLE: Record<CalloutTone, 'status' | 'alert' | undefined> = {
  info: undefined,
  success: 'status',
  warning: 'status',
  danger: 'alert',
}

export function Callout({
  tone = 'info',
  title,
  children,
  className,
}: Readonly<{
  tone?: CalloutTone
  /** An optional short title, in bold above the body. */
  title?: string
  children?: React.ReactNode
  className?: string
}>) {
  return (
    <div
      role={CALLOUT_ROLE[tone]}
      className={clsx('rounded-lg border border-l-4 border-(--ds-divider) px-4 py-3', CALLOUT_TONE_CLASS[tone], className)}
    >
      {title !== undefined && title !== '' && <p className="text-sm font-semibold">{title}</p>}
      {children !== undefined && <div className={clsx('text-sm', title !== undefined && title !== '' && 'mt-1')}>{children}</div>}
    </div>
  )
}
