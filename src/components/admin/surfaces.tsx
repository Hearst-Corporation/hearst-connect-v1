import { RequirementList, surfaceRaised } from '@/components/admin/surface'
import {
  Table as CatalystTable,
  TableBody as CatalystTableBody,
  TableCell as CatalystTableCell,
  TableHead as CatalystTableHead,
  TableHeader as CatalystTableHeader,
  TableRow as CatalystTableRow,
} from '@/components/catalyst/table'
import { sectionContentGap } from '@/lib/layout-tokens'
import { AdminBody, AdminCaption, AdminLabel, AdminSectionTitle, AdminSurfaceTitle, adminTypography } from '@/components/admin/typography'
import {
  ProblemState,
  RequestMetadata,
  StatusBadge,
  UnavailableState,
} from '@/components/admin/truthful'
import { formatNumber } from '@/lib/format'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { Resolved, ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Hearst Connect admin surface primitives.
 * Sunken band (AdminSection) + raised cards (AdminSurface).
 * Every component here renders what the backend gives it — none of them fabricate data.
 */

/* ── AdminSurface ─────────────────────────────────────────────────────────── */

export function AdminSurface({
  children,
  className,
  as: Tag = 'section',
  padding = false,
}: Readonly<{
  children: React.ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'nav'
  padding?: boolean
}>) {
  return (
    <Tag
      className={clsx(
        className,
        surfaceRaised,
        'overflow-hidden transition-[box-shadow,background-color,border-color] duration-200',
        padding && 'p-6',
      )}
    >
      {children}
    </Tag>
  )
}

/* ── AdminSection ─────────────────────────────────────────────────────────── */

export function AdminSection({
  title,
  description,
  actions,
  index,
  children,
  id,
  className,
}: Readonly<{
  title?: string
  description?: string
  actions?: React.ReactNode
  index?: string
  children: React.ReactNode
  id?: string
  className?: string
}>) {
  const hasHeader = Boolean(title || actions || description)

  return (
    <section id={id} className={clsx(className, hasHeader && 'border-t border-zinc-950/10 pt-8 dark:border-console-line')}>
      {hasHeader ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-3">
              {index ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-200/80 text-[0.6875rem] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {index}
                </span>
              ) : null}
              {title ? <AdminSectionTitle>{title}</AdminSectionTitle> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
          {description ? <AdminBody className="mt-1.5 max-w-3xl">{description}</AdminBody> : null}
        </>
      ) : null}
      {/*
        A section is NOT a card.

        It used to wrap its children in a sunken, ringed, padded panel — so
        every card on the page sat inside a second box that carried no
        information of its own, and the whole console read as boxes inside
        boxes. A section separates with a rule above and space below; the
        cards inside it are the only surfaces.
      */}
      <div className={clsx(hasHeader && 'mt-6', sectionContentGap)}>{children}</div>
    </section>
  )
}

/* ── AdminMetric ──────────────────────────────────────────────────────────── */

export function AdminMetric({
  label,
  value,
  unit,
  hint,
  status,
  className,
}: Readonly<{
  label: string
  value: string | number | null | undefined
  unit?: string
  hint?: string
  status?: ResolvedStatus
  className?: string
}>) {
  const displayable =
    value !== null && value !== undefined && (typeof value !== 'number' || Number.isFinite(value))

  return (
    <div
      className={clsx(
        className,
        // A tile is its own surface now that a section is no longer a card:
        // one ring, one background, no second frame around it.
        'min-w-0 rounded-xl bg-white p-4 ring-1 ring-zinc-950/10 dark:bg-console-card dark:ring-console-line',
      )}
    >
      <AdminLabel>{label}</AdminLabel>
      <p className="mt-1.5 flex items-baseline gap-2">
        {displayable ? (
          <span className={clsx(adminTypography.numericStandard, 'wrap-break-word')}>
            {typeof value === 'number' ? formatNumber(value) : value}
            {unit ? <span className="ml-1 text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">{unit}</span> : null}
          </span>
        ) : (
          <span className={clsx(adminTypography.numericStandard, 'text-zinc-500 dark:text-zinc-400')} title={status ?? 'Aucune valeur'}>—</span>
        )}
      </p>
      {hint ? <AdminCaption className="mt-1">{hint}</AdminCaption> : null}
    </div>
  )
}

/* ── AdminChart ───────────────────────────────────────────────────────────── */

/**
 * Historical alias of `ChartFrame` — same props, same render. Kept as a
 * re-export so the public name stays stable without duplicating the component.
 */
export { ChartFrame as AdminChart } from '@/components/charts'

/* ── AdminTable ─────────────────────────────────────────────────────────── */

export type AdminTableColumn<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  mono?: boolean
}

export function AdminTable<T>({
  columns,
  rows,
  keyFn,
  empty,
}: Readonly<{
  columns: readonly AdminTableColumn<T>[]
  rows: readonly T[]
  keyFn: (row: T) => string
  empty?: React.ReactNode
}>) {
  if (rows.length === 0) {
    return empty ?? <AdminEmptyState title="Aucun élément" />
  }

  return (
    <CatalystTable
      dense
      grid
      className="[&_table]:w-full [&_table]:table-fixed whitespace-normal wrap-break-word"
    >
      <CatalystTableHead>
        <CatalystTableRow>
          {columns.map((col) => (
            <CatalystTableHeader key={col.key} scope="col" className={clsx(col.className, 'font-medium')}>
              {col.header}
            </CatalystTableHeader>
          ))}
        </CatalystTableRow>
      </CatalystTableHead>
      <CatalystTableBody>
        {rows.map((row) => (
          <CatalystTableRow key={keyFn(row)}>
            {columns.map((col) => (
              <CatalystTableCell
                key={col.key}
                className={clsx(col.className, col.mono && 'font-mono text-xs text-zinc-500 dark:text-zinc-400')}
              >
                {col.cell(row)}
              </CatalystTableCell>
            ))}
          </CatalystTableRow>
        ))}
      </CatalystTableBody>
    </CatalystTable>
  )
}

/* ── AdminStatus ──────────────────────────────────────────────────────────── */

export function AdminStatus({
  status,
  label,
  className,
}: Readonly<{ status: ResolvedStatus | 'SNAPSHOT'; label?: string; className?: string }>) {
  return (
    <span className={clsx(className, 'inline-flex items-center gap-2')}>
      <StatusBadge status={status} />
      {label ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span> : null}
    </span>
  )
}

/* ── States ───────────────────────────────────────────────────────────────── */

/**
 * One concise absence. Left-aligned and sized to its sentence: a centered
 * block with 40px of vertical padding announced an outage, when all it had
 * to say was "nothing here yet".
 */
function AdminEmptyState({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children?: React.ReactNode }>) {
  return (
    <div className="px-4 py-5 sm:px-5">
      <AdminSurfaceTitle as="p">{title}</AdminSurfaceTitle>
      {description ? <AdminBody className="mt-1.5 max-w-prose">{description}</AdminBody> : null}
      {children}
    </div>
  )
}

export function AdminErrorState({
  state,
  title,
  children,
}: Readonly<{ state: Resolved<unknown>; title?: string; children?: React.ReactNode }>) {
  return (
    <AdminSurface>
      <UnavailableState state={state}>
        {title ? <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">{title}</p> : null}
        {children}
      </UnavailableState>
    </AdminSurface>
  )
}

/**
 * Same state as `SourceAttendue`, in the surfaces vocabulary. One card, one
 * list — the ringed inner box that used to hold the requirements is gone.
 */
export function AdminSourceAttendue({
  quoi,
  detail,
  requis,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <div className={clsx(surfaceRaised, 'p-6')}>
      <AdminSurfaceTitle as="p">{quoi}</AdminSurfaceTitle>
      <AdminBody className="mt-1.5 max-w-prose">{detail}</AdminBody>
      <div className="mt-4 max-w-prose">
        <AdminLabel>Source attendue</AdminLabel>
        <RequirementList requis={requis} />
      </div>
    </div>
  )
}

/* ── AdminToolbar ─────────────────────────────────────────────────────────── */

export function AdminToolbar({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div
      className={clsx(
        className,
        'flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50/80 dark:bg-console-inset px-4 py-3 ring-1 ring-zinc-950/10 dark:ring-console-line',
      )}
    >
      {children}
    </div>
  )
}

/* ── AdminFilterBar ───────────────────────────────────────────────────────── */

type AdminFilterItem = {
  id: string
  label: string
  count?: string | null
  disabled?: boolean
  active?: boolean
  title?: string
}

export function AdminFilterBar({
  items,
  ariaLabel = 'Filtres',
}: Readonly<{
  items: readonly AdminFilterItem[]
  ariaLabel?: string
}>) {
  return (
    <AdminSurface as="nav" className="px-2 py-2">
      <ul className="flex flex-wrap gap-1" aria-label={ariaLabel}>
        {items.map((item) => (
          <li key={item.id}>
            <span
              title={item.title ?? 'Filter not active — source pending'}
              aria-disabled="true"
              className={clsx(
                'inline-flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm',
                item.active ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400' : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              {item.label}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>
            </span>
          </li>
        ))}
      </ul>
    </AdminSurface>
  )
}

/* ── AdminStatusMatrix ────────────────────────────────────────────────────── */

export type StatusMatrixRow = {
  id: string
  label: string
  status: ResolvedStatus | 'SNAPSHOT'
  detail?: string
  ton?: 'sain' | 'attention' | 'critique' | 'neutre'
}

const MATRIX_DOT: Record<string, string> = {
  sain: 'bg-success-500',
  attention: 'bg-warning-500',
  critique: 'bg-danger-500',
  // `zinc-500` et non `neutral-600` : même valeur (#7f7f7f dans le thème
  // global), mais `neutral-*` était la dernière survivance d'une famille de
  // tokens parallèle. Les trois autres pastilles parlent déjà la grammaire
  // sémantique du produit ; celle-ci parlait un autre dialecte pour la même
  // couleur.
  neutre: 'bg-zinc-500',
}

export function AdminStatusMatrix({ rows, title }: Readonly<{ rows: readonly StatusMatrixRow[]; title?: string }>) {
  return (
    <AdminSurface>
      {title ? (
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <AdminSurfaceTitle>{title}</AdminSurfaceTitle>
        </div>
      ) : null}
      <ul className="divide-y divide-zinc-950/5 pb-1 dark:divide-console-line-soft">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 sm:px-6">
            <span
              aria-hidden="true"
              className={clsx('size-1.5 shrink-0 rounded-full', MATRIX_DOT[row.ton ?? 'neutre'])}
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{row.label}</span>
            <AdminStatus status={row.status} />
            {row.detail ? (
              <span className="ml-auto text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{row.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminSurface>
  )
}

/* ── AdminProbeResult ─────────────────────────────────────────────────────── */

export function AdminProbeResult({
  status,
  reason,
  trace,
  rawJson,
  problem,
  keeper,
}: Readonly<{
  status: ResolvedStatus | 'SNAPSHOT'
  reason?: string | null
  trace: CallTrace
  rawJson?: string
  problem?: Problem | null
  keeper?: KeeperActionResult | null
}>) {
  return (
    <div className="rounded-lg bg-zinc-50/80 dark:bg-console-inset p-3 ring-1 ring-zinc-950/10 dark:ring-console-line">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
      </div>
      {reason ? <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{reason}</p> : null}
      <div className="mt-2">
        <RequestMetadata trace={trace} />
      </div>
      {rawJson ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white">JSON brut</summary>
          <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs text-zinc-950 dark:text-white/80">{rawJson}</pre>
        </details>
      ) : null}
      <ProblemState problem={problem ?? null} keeper={keeper ?? null} />
    </div>
  )
}

/* ── Re-exports ───────────────────────────────────────────────────────────── */

export { EmptyState, ProblemState, StatusBadge, UnavailableState } from '@/components/admin/truthful'
