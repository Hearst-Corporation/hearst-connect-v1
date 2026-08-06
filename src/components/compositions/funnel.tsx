import { gcc, Reading } from '@/components/layout/console'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { Panel } from '@/components/compositions/panel'
import clsx from 'clsx'

/**
 * The operational funnel — pipeline of ordered steps, each carrying its own
 * count, its pending sub-count, and the route that resolves it.
 *
 * Deliberately horizontal bars, not a donut: a funnel is a SEQUENCE (the
 * mission's own instruction), and a donut cannot express order or where the
 * client journey narrows. Width of the filled bar is proportional to the
 * step's own count against the funnel's first (widest) step — a visual
 * narrowing, not a computed conversion rate the backend never published.
 */

export type FunnelStepView = Readonly<{
  id: string
  label: string
  count: Availability<string>
  pending: Availability<string>
  actionHref: string
  actionLabel: string
  sourceNote: string
}>

function numeric(count: Availability<string>): number | null {
  if (!isAvailable(count)) return null
  const n = Number(count.value)
  return Number.isFinite(n) ? n : null
}

export function FunnelPipeline({
  steps,
  className,
}: Readonly<{ steps: readonly FunnelStepView[]; className?: string }>) {
  // The widest bar is the largest REAL count among the steps — a step whose
  // source is absent contributes no width claim, it is simply excluded from
  // the max rather than counted as a measured zero.
  const knownCounts = steps.map((s) => numeric(s.count)).filter((n): n is number => n !== null)
  const widest = knownCounts.length > 0 ? Math.max(1, ...knownCounts) : 1

  return (
    <Panel tone="wave" className={className} data-widget="funnel-pipeline">
      <ol className="space-y-3 px-5 py-4">
        {steps.map((step, index) => {
          const value = numeric(step.count)
          const widthPct = value === null ? 0 : Math.max(4, Math.round((value / widest) * 100))
          const pendingValue = valueOf(step.pending)

          return (
            <li key={step.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2 sm:w-48">
                <span className={clsx(gcc.cellText, 'text-xs tabular-nums text-zinc-500')} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={clsx(gcc.cardTitle, 'text-sm')}>{step.label}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className="h-8 w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900/60"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={widest}
                  aria-valuenow={value === null ? undefined : value}
                  aria-label={`${step.label} — ${isAvailable(step.count) ? step.count.value : 'donnée indisponible'}`}
                >
                  <div
                    className="h-full rounded-md bg-accent-400/70 transition-[width] duration-500 ease-out"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:w-64 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums">
                  <Reading value={step.count} />
                </span>
                {pendingValue !== null && pendingValue !== '0' ? (
                  <Badge color="amber">{pendingValue} en attente</Badge>
                ) : null}
                <Link href={step.actionHref} className="text-xs underline underline-offset-2">
                  {step.actionLabel}
                </Link>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-console-line-soft px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
        Chaque étape lit sa propre source réelle — voir les notes de source dans la matrice endpoint/module de la
        livraison.
      </p>
    </Panel>
  )
}
