import { surfaceRaised } from '@/components/admin/surface'
import { sectionContentGap } from '@/lib/layout-tokens'
import { AdminBody, AdminCaption, AdminLabel, AdminSectionTitle, AdminSurfaceTitle, adminTypography } from '@/components/admin/typography'
import { ProblemState, RequestMetadata, StatusBadge } from '@/components/admin/truthful'
import { formatNumber } from '@/lib/format'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Hearst Connect admin surface primitives.
 * Sunken band (AdminSection) + raised cards (AdminSurface).
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
        surfaceRaised,
        'overflow-hidden transition-[box-shadow,background-color,border-color] duration-200',
        padding && 'p-6',
      )}
    >
      {children}
    </Tag>
  )
}

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
      <div className={clsx(hasHeader && 'mt-6', sectionContentGap)}>{children}</div>
    </section>
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
