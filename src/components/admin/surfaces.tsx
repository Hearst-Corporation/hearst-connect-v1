import { surfaceBox, surfaceInset } from '@/components/admin/surface'
import { AdminCaption, AdminLabel, adminTypography } from '@/components/admin/typography'
import { ProblemState, RequestMetadata, StatusBadge } from '@/components/admin/truthful'
import { formatNumber } from '@/lib/format'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Hearst Connect admin surface wrappers.
 * Material = `surfaceBox` / `surfaceInset` (PASS 2 canon) — not a second glass layer.
 * Prefer `Panel` / `DashCard` for new work.
 * Every component here renders what the backend gives it — none of them fabricate data.
 */

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
        surfaceBox,
        'overflow-hidden transition-[box-shadow,background-color,border-color] duration-200',
        padding && 'p-6',
      )}
    >
      {children}
    </Tag>
  )
}

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
        surfaceBox,
        'min-w-0 p-4',
      )}
    >
      <AdminLabel>{label}</AdminLabel>
      <p className="mt-1.5 flex items-baseline gap-2">
        {displayable ? (
          <span className={clsx(adminTypography.numericStandard, 'wrap-break-word')}>
            {typeof value === 'number' ? formatNumber(value) : value}
            {unit ? <span className="ml-1 text-sm/6 font-medium text-fg-tertiary dark:text-fg-secondary">{unit}</span> : null}
          </span>
        ) : (
          <span className={clsx(adminTypography.numericStandard, 'text-fg-tertiary dark:text-fg-secondary')} title={status ?? 'No value'}>—</span>
        )}
      </p>
      {hint ? <AdminCaption className="mt-1">{hint}</AdminCaption> : null}
    </div>
  )
}

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
    <div className={clsx(surfaceInset, 'p-3')}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
      </div>
      {reason ? <p className="mt-2 text-xs text-fg-tertiary dark:text-fg-secondary">{reason}</p> : null}
      <div className="mt-2">
        <RequestMetadata trace={trace} />
      </div>
      {rawJson ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-fg-tertiary dark:text-fg-secondary hover:text-ink dark:hover:text-white">JSON brut</summary>
          <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs text-ink dark:text-fg/80">{rawJson}</pre>
        </details>
      ) : null}
      <ProblemState problem={problem ?? null} keeper={keeper ?? null} />
    </div>
  )
}
