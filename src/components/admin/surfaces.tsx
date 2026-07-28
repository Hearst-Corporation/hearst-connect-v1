import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { AdminBody, AdminCaption, AdminH2, AdminH3, AdminLabel, adminTypography } from '@/components/admin/typography'
import {
  EmptyState,
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
 *
 * Composants réutilisables pour cartes, métriques, tableaux, graphiques et états.
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
    <Tag
      className={clsx(
        className,
        'rounded-xl bg-brand-surface shadow-xs ring-1 ring-white/10',
        padding && 'p-5',
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
  action,
  children,
  id,
  className,
}: Readonly<{
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  id?: string
  className?: string
}>) {
  return (
    <section id={id} className={clsx(className, 'space-y-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <AdminH2>{title}</AdminH2>
          {description ? <AdminBody className="mt-1">{description}</AdminBody> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
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
    <div className={clsx(className, 'min-w-0 rounded-lg bg-brand-background/40 px-4 py-3.5 ring-1 ring-white/10')}>
      <AdminLabel>{label}</AdminLabel>
      <p className="mt-1.5 flex items-baseline gap-2">
        {displayable ? (
          <span className={adminTypography.kpiValue}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            {unit ? <span className="ml-1 text-sm/6 font-medium text-brand-muted">{unit}</span> : null}
          </span>
        ) : (
          <span className={clsx(adminTypography.kpiValue, 'text-brand-muted')} title={status ? status : 'Aucune valeur'}>—</span>
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
          <tr className="border-b border-brand-border/40 text-xs text-brand-muted">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={clsx(col.className, 'px-5 py-3 font-medium')}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/30">
          {rows.map((row) => (
            <tr key={keyFn(row)} className="hover:bg-white/[0.03]">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(col.className, 'px-5 py-3.5', col.mono && 'font-mono text-xs text-brand-muted')}
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
      {label ? <span className="text-xs text-brand-muted">{label}</span> : null}
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
    <AdminSurface className="px-6 py-10 text-center">
      <p className={adminTypography.h3}>{title}</p>
      {description ? <AdminBody className="mt-2">{description}</AdminBody> : null}
      {children}
    </AdminSurface>
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
        {title ? <p className="mt-2 text-sm font-medium text-brand-foreground">{title}</p> : null}
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
        className="size-4 animate-pulse rounded-full bg-brand-accent/60"
      />
      <p className="text-sm text-brand-muted">{message}</p>
    </AdminSurface>
  )
}

export function AdminSourceAttendue({
  quoi,
  detail,
  requis,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <AdminEmptyState title={quoi} description={detail}>
      <div className="mx-auto mt-6 max-w-md rounded-lg bg-brand-background/60 px-4 py-3 text-left ring-1 ring-brand-border/40">
        <p className="text-xs tracking-wide text-brand-muted uppercase">Source attendue</p>
        <ul className="mt-2 space-y-1">
          {requis.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-brand-foreground/90">
              <span aria-hidden="true" className="text-brand-muted">·</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </AdminEmptyState>
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
        'flex flex-wrap items-center gap-3 rounded-lg bg-brand-background/50 px-4 py-3 ring-1 ring-brand-border/40',
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
                item.active ? 'bg-brand-accent/15 text-brand-accent' : 'text-brand-muted',
              )}
            >
              {item.label}
              <span className="text-xs text-brand-muted">—</span>
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
        <p className="mt-4 text-xs text-brand-muted">
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
      <ul className="divide-y divide-brand-border/30">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
            <span
              aria-hidden="true"
              className={clsx('size-1.5 shrink-0 rounded-full', MATRIX_DOT[row.ton ?? 'neutre'])}
            />
            <span className="text-sm text-brand-muted">{row.label}</span>
            <AdminStatus status={row.status} />
            {row.detail ? <span className="ml-auto text-xs text-brand-muted tabular-nums">{row.detail}</span> : null}
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
    <div className="rounded-lg bg-brand-background/60 p-3 ring-1 ring-brand-border/40">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
      </div>
      {reason ? <p className="mt-2 text-xs text-brand-muted">{reason}</p> : null}
      <div className="mt-2">
        <RequestMetadata trace={trace} />
      </div>
      {rawJson ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-brand-muted hover:text-brand-foreground">JSON brut</summary>
          <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs text-brand-foreground/80">{rawJson}</pre>
        </details>
      ) : null}
      <ProblemState problem={problem ?? null} keeper={keeper ?? null} />
    </div>
  )
}

/* ── Re-exports utiles ────────────────────────────────────────────────────── */

export { EmptyState, ProblemState, StatusBadge, UnavailableState }
