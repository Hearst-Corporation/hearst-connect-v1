import { formatPercent } from '@/lib/format'
import clsx from 'clsx'

/**
 * "How much of the cap is already committed?"
 *
 * A horizontal bar rather than a circular gauge: the cap is a linear limit,
 * and the eye compares two lengths better than two arcs. The figure is
 * written next to it — the bar illustrates it, it doesn't replace it.
 *
 * The threshold colors the fill: below 75% things are comfortable, above
 * 90% the remaining capacity becomes a topic. The label says so too, for
 * anyone who can't distinguish the shades.
 */

export function CapacityBar({
  utiliseBps,
  disponible,
  total,
}: Readonly<{ utiliseBps: number | null; disponible: string; total: string }>) {
  if (utiliseBps === null || !Number.isFinite(utiliseBps)) {
    return (
      <p className="text-sm text-zinc-500">
        The utilization rate could not be read. No bar is drawn rather than a bar at zero.
      </p>
    )
  }

  const percent = utiliseBps / 100
  const width = Math.min(100, Math.max(0, percent))
  const tight = percent >= 90
  const sustained = percent >= 75 && percent < 90

  let toneText = 'text-success-400'
  let toneMessage = 'Comfortable capacity'
  let toneBar = 'bg-accent-400'
  if (tight) {
    toneText = 'text-danger-400'
    toneMessage = 'Capacity nearly reached'
    toneBar = 'bg-danger-500'
  } else if (sustained) {
    toneText = 'text-warning-400'
    toneMessage = 'Sustained utilization'
    toneBar = 'bg-warning-500'
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-2xl font-semibold text-white tabular-nums">
          {formatPercent(utiliseBps, { fromBps: true, maximumFractionDigits: 2 })}
        </p>
        <p className={clsx('text-xs font-medium', toneText)}>{toneMessage}</p>
      </div>

      <div
        role="img"
        aria-label={`Cap used at ${percent.toFixed(2)} percent`}
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div className={clsx('h-full rounded-full', toneBar)} style={{ width: `${width}%` }} />
      </div>

      <dl className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-zinc-500 dark:text-zinc-400">Still available</dt>
          <dd className="text-zinc-700 tabular-nums dark:text-zinc-300">{disponible}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-zinc-500 dark:text-zinc-400">Cap</dt>
          <dd className="text-zinc-700 tabular-nums dark:text-zinc-300">{total}</dd>
        </div>
      </dl>
    </div>
  )
}
