import { surfaceInset } from '@/components/admin/surface'
import { formatDateTime, formatNumber } from '@/lib/format'
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

type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

const STATUS_TONE: Record<ResolvedStatus | 'SNAPSHOT', BadgeTone> = {
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

const TONE_CLASS: Record<BadgeTone, string> = {
  ok: 'bg-success-400/15 text-success-400 ring-success-400/30',
  warn: 'bg-warning-400/15 text-warning-400 ring-warning-400/30',
  bad: 'bg-danger-400/20 text-danger-400 ring-danger-400/40',
  info: 'bg-white/5 text-zinc-300 ring-console-line-strong',
  neutral: 'bg-white/5 text-zinc-400 ring-console-line-strong',
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
        TONE_CLASS[STATUS_TONE[status]],
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
        conspicuous ? 'font-medium text-warning-400' : 'text-zinc-500',
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
      <span className={clsx(className, 'text-zinc-500')} title={status ? STATUS_LABEL[status] : 'No value received'}>
        —
      </span>
    )
  }

  return (
    <span className={clsx(className, 'tabular-nums text-zinc-950 dark:text-white')}>
      {typeof value === 'number' ? formatNumber(value) : value}
      {unit ? <span className="ml-1 text-zinc-500">{unit}</span> : null}
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

  return <p className="font-mono text-xs break-all text-zinc-500">{bits.join(' · ')}</p>
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
      <p className="mt-3 text-sm font-medium text-white">{title}</p>
      {reason ? <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">{reason}</p> : null}
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
        <p className="mt-3 font-mono text-xs break-all text-zinc-600 dark:text-zinc-400">
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
          <dt className="text-zinc-500">Code</dt>
          <dd className="font-mono text-white">{problem.code}</dd>
          <dt className="text-zinc-500">Title</dt>
          <dd className="text-zinc-300">{problem.title}</dd>
          <dt className="text-zinc-500">Detail</dt>
          <dd className="text-zinc-300">{problem.detail}</dd>
          <dt className="text-zinc-500">Request ID</dt>
          <dd className="font-mono break-all text-zinc-400">{problem.requestId}</dd>
        </>
      ) : null}
      {keeper ? (
        <>
          <dt className="text-zinc-500">Reason</dt>
          <dd className="font-mono text-zinc-950 dark:text-white">{keeper.reason}</dd>
          {keeper.detail ? (
            <>
              <dt className="text-zinc-500">Detail</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{keeper.detail}</dd>
            </>
          ) : null}
        </>
      ) : null}
    </dl>
  )
}
