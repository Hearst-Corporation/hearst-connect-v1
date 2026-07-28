import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { surfaceRaised } from '@/components/admin/surface'
import { AdminBody, AdminCaption, AdminH3, AdminLabel, adminTypography } from '@/components/admin/typography'
import {
  ProblemState,
  RequestMetadata,
  StatusBadge,
  UnavailableState,
} from '@/components/admin/truthful'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { Resolved, ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Design system des surfaces d'administration Hearst Connect.
 * Chrome Qatar : bandeau sunken (AdminSection) + cartes raised (AdminSurface).
 * Toute donnée affichée doit provenir du backend ; ces composants ne fabriquent rien.
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
    <Tag className={clsx(className, surfaceRaised, padding && 'p-5')}>
      {children}
    </Tag>
  )
}

/* ── AdminSection ─────────────────────────────────────────────────────────── */

export function AdminSection({
  title,
  description,
  action,
  children,
  id,
  className,
  index,
}: Readonly<{
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  id?: string
  className?: string
  index?: string
}>) {
  return (
    <CockpitSection
      id={id}
      index={index}
      title={title}
      description={description}
      actions={action}
      className={className}
    >
      {children}
    </CockpitSection>
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
    <div className={clsx(className, 'min-w-0 rounded-lg bg-zinc-50/80 dark:bg-zinc-950/40 px-4 py-3.5 ring-1 ring-white/10')}>
      <AdminLabel>{label}</AdminLabel>
      <p className="mt-1.5 flex items-baseline gap-2">
        {displayable ? (
          <span className={adminTypography.kpiValue}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            {unit ? <span className="ml-1 text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">{unit}</span> : null}
          </span>
        ) : (
          <span className={clsx(adminTypography.kpiValue, 'text-zinc-500 dark:text-zinc-400')} title={status ?? 'Aucune valeur'}>—</span>
        )}
      </p>
      {hint ? <AdminCaption className="mt-1.5">{hint}</AdminCaption> : null}
    </div>
  )
}

/* ── AdminChart ───────────────────────────────────────────────────────────── */

export function AdminChart({
  question,
  unite,
  provenance,
  etat,
  children,
  hauteur,
}: Readonly<{
  question: string
  unite: string
  provenance: string
  etat: EtatSerie
  children?: React.ReactNode
  hauteur?: string
}>) {
  return (
    <ChartFrame question={question} unite={unite} provenance={provenance} etat={etat} hauteur={hauteur}>
      {children}
    </ChartFrame>
  )
}

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
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-950/10 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={clsx(col.className, 'px-5 py-3 font-medium')}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
          {rows.map((row) => (
            <tr key={keyFn(row)} className="hover:bg-white/[0.03]">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(col.className, 'px-5 py-3.5', col.mono && 'font-mono text-xs text-zinc-500 dark:text-zinc-400')}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

/* ── États ────────────────────────────────────────────────────────────────── */

export function AdminEmptyState({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children?: React.ReactNode }>) {
  return (
    <div className="px-6 py-10 text-center">
      <p className={adminTypography.h3}>{title}</p>
      {description ? <AdminBody className="mt-2">{description}</AdminBody> : null}
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

export function AdminLoadingState({ message = 'Chargement…' }: Readonly<{ message?: string }>) {
  return (
    <AdminSurface className="flex items-center gap-3 px-5 py-8">
      <span
        aria-hidden="true"
        className="size-4 animate-pulse rounded-full bg-accent-500/60"
      />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </AdminSurface>
  )
}

export function AdminSourceAttendue({
  quoi,
  detail,
  requis,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <div className={clsx(surfaceRaised, 'px-5 py-6 sm:px-6')}>
      <p className={adminTypography.h3}>{quoi}</p>
      <AdminBody className="mt-2">{detail}</AdminBody>
      <div className="mt-5 rounded-lg bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:ring-white/5">
        <p className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Source attendue</p>
        <ul className="mt-2 space-y-1">
          {requis.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span aria-hidden="true" className="text-zinc-400">
                ·
              </span>
              {r}
            </li>
          ))}
        </ul>
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
        'flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-950/40 px-4 py-3 ring-1 ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      {children}
    </div>
  )
}

/* ── AdminFilterBar ───────────────────────────────────────────────────────── */

export type AdminFilterItem = {
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
              title={item.title ?? 'Filtre non actif — source en attente'}
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

/* ── AdminDetailPanel → surfaces-client.tsx ───────────────────────────────── */

/* ── AdminActionPanel ─────────────────────────────────────────────────────── */

export function AdminActionPanel({
  title,
  description,
  confirmLabel,
  danger,
  disabled,
  children,
}: Readonly<{
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  disabled?: boolean
  children?: React.ReactNode
}>) {
  return (
    <AdminSurface className="p-5">
      <AdminH3>{title}</AdminH3>
      {description ? <AdminBody className="mt-2">{description}</AdminBody> : null}
      {children}
      {confirmLabel ? (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Action sensible — confirmation requise :{' '}
          <span className={clsx(danger && 'text-danger-400', 'font-mono')}>{confirmLabel}</span>
        </p>
      ) : null}
      {disabled ? (
        <p className="mt-3 text-xs text-warning-400">Action désactivée — permissions ou configuration insuffisante.</p>
      ) : null}
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
  neutre: 'bg-neutral-600',
}

export function AdminStatusMatrix({ rows, title }: Readonly<{ rows: readonly StatusMatrixRow[]; title?: string }>) {
  return (
    <AdminSurface>
      {title ? (
        <div className="border-b border-white/5 px-5 py-4 sm:px-6 sm:py-5">
          <AdminH3>{title}</AdminH3>
        </div>
      ) : null}
      <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 sm:px-6">
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
    <div className="rounded-lg bg-zinc-50/80 dark:bg-zinc-950/50 p-3 ring-1 ring-zinc-950/10 dark:ring-white/10">
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

/* ── Re-exports utiles ────────────────────────────────────────────────────── */

export { EmptyState, ProblemState, StatusBadge, UnavailableState } from '@/components/admin/truthful'
