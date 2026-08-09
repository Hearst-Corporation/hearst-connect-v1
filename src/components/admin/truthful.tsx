import { surfaceInset } from '@/components/admin/surface'
import { ADMIN_TONE_CLASS, type AdminBadgeTone } from '@/components/admin/status-tone'
import { formatNumber } from '@/lib/format'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { Resolved, ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Truthful-rendering components for the admin console.
 *
 * One rule: what renders comes from the backend, or carries a named state.
 * None of these components fabricate a value, round an absence to zero, or
 * requalify a status. `SIMULATED` only exists if the backend said so.
 */

const STATUS_TONE: Record<ResolvedStatus | 'SNAPSHOT', AdminBadgeTone> = {
  LIVE: 'ok',
  SNAPSHOT: 'info',
  STALE: 'warn',
  PARTIAL: 'warn',
  EMPTY: 'neutral',
  SIMULATED: 'warn',
  NOT_CONFIGURED: 'warn',
  UNAVAILABLE: 'bad',
  NOT_SUPPORTED: 'neutral',
  PERMISSION_DENIED: 'bad',
  ERROR: 'bad',
}

const STATUS_LABEL: Record<ResolvedStatus | 'SNAPSHOT', string> = {
  LIVE: 'Live',
  SNAPSHOT: 'Snapshot',
  STALE: 'Stale data',
  PARTIAL: 'Partial',
  EMPTY: 'No data',
  SIMULATED: 'Simulated (backend)',
  NOT_CONFIGURED: 'Not configured',
  UNAVAILABLE: 'Unavailable',
  NOT_SUPPORTED: 'Not supported',
  PERMISSION_DENIED: 'Access denied',
  ERROR: 'Error',
}

export function StatusBadge({
  status,
  className,
}: Readonly<{ status: ResolvedStatus | 'SNAPSHOT'; className?: string }>) {
  return (
    <span
      className={clsx(
        className,
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ADMIN_TONE_CLASS[STATUS_TONE[status]],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

const PROVENANCE_LABEL: Record<string, string> = {
  live: 'Live source',
  db: 'Database',
  indexed: 'Indexed',
  manual: 'Manual source',
  fixture: 'Backend fixture — not a real source',
}

export function DataProvenance({
  provenance,
  source,
  className,
}: Readonly<{ provenance?: string | null; source?: string | null; className?: string }>) {
  if (!provenance && !source) return null
  const label = provenance ? (PROVENANCE_LABEL[provenance] ?? provenance) : null
  const conspicuous = provenance === 'fixture' || provenance === 'manual'

  return (
    <span
      className={clsx(
        className,
        'text-xs',
        conspicuous ? 'font-medium text-warning-400' : 'text-fg-tertiary',
      )}
    >
      {[label, source].filter(Boolean).join(' · ')}
    </span>
  )
}

export function ResolvedValue({
  value,
  status,
  unit,
  className,
}: Readonly<{ value: string | number | null | undefined; status?: ResolvedStatus; unit?: string; className?: string }>) {
  const displayable =
    value !== null && value !== undefined && (typeof value !== 'number' || Number.isFinite(value))

  if (!displayable) {
    return (
      <span className={clsx(className, 'text-fg-tertiary')} title={status ? STATUS_LABEL[status] : 'No value received'}>
        —
      </span>
    )
  }

  return (
    <span className={clsx(className, 'tabular-nums text-fg')}>
      {typeof value === 'number' ? formatNumber(value) : value}
      {unit ? <span className="ml-1 text-fg-tertiary">{unit}</span> : null}
    </span>
  )
}

export function RequestMetadata({ trace }: Readonly<{ trace: CallTrace }>) {
  const bits = [
    trace.httpStatus !== null ? `HTTP ${trace.httpStatus}` : 'no response',
    `${trace.durationMs}ms`,
    trace.requestId ? `req ${trace.requestId}` : null,
    trace.rateLimitRemaining !== null ? `quota ${trace.rateLimitRemaining}` : null,
  ].filter(Boolean)

  return <p className="font-mono text-xs break-all text-fg-tertiary">{bits.join(' · ')}</p>
}

function StateShell({
  status,
  title,
  reason,
  children,
}: Readonly<{ status: ResolvedStatus; title: string; reason?: string | null; children?: React.ReactNode }>) {
  return (
    <div className={clsx(surfaceInset, 'border border-dashed border-console-line px-5 py-8 text-center')}>
      <StatusBadge status={status} />
      <p className="mt-3 text-sm font-medium text-fg">{title}</p>
      {reason ? <p className="mx-auto mt-2 max-w-xl text-sm text-fg-secondary">{reason}</p> : null}
      {children}
    </div>
  )
}

export function EmptyState({ reason }: Readonly<{ reason?: string | null }>) {
  return <StateShell status="EMPTY" title="Empty response" reason={reason ?? 'The backend returned no items.'} />
}

export function UnavailableState({ state, children }: Readonly<{ state: Resolved<unknown>; children?: React.ReactNode }>) {
  return (
    <StateShell status={state.status} title={STATUS_LABEL[state.status]} reason={state.reason}>
      {state.provenance.route ? (
        <p className="mt-3 font-mono text-xs break-all text-fg-muted dark:text-fg-secondary">
          {state.provenance.route}
          {state.provenance.requestId ? ` · req ${state.provenance.requestId}` : null}
        </p>
      ) : null}
      {children}
    </StateShell>
  )
}

export function ProblemState({ problem, keeper }: Readonly<{ problem: Problem | null; keeper?: KeeperActionResult | null }>) {
  if (!problem && !keeper) return null

  return (
    <dl className={clsx(surfaceInset, 'mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 p-4 text-xs')}>
      {problem ? (
        <>
          <dt className="text-fg-tertiary">Code</dt>
          <dd className="font-mono text-fg">{problem.code}</dd>
          <dt className="text-fg-tertiary">Title</dt>
          <dd className="text-fg">{problem.title}</dd>
          <dt className="text-fg-tertiary">Detail</dt>
          <dd className="text-fg">{problem.detail}</dd>
          <dt className="text-fg-tertiary">Request ID</dt>
          <dd className="font-mono break-all text-fg-secondary">{problem.requestId}</dd>
        </>
      ) : null}
      {keeper ? (
        <>
          <dt className="text-fg-tertiary">Reason</dt>
          <dd className="font-mono text-fg">{keeper.reason}</dd>
          {keeper.detail ? (
            <>
              <dt className="text-fg-tertiary">Detail</dt>
              <dd className="text-fg">{keeper.detail}</dd>
            </>
          ) : null}
        </>
      ) : null}
    </dl>
  )
}
