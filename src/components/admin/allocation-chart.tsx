import { formatPercent } from '@/lib/format'
import clsx from 'clsx'

/**
 * "Is the money placed where it should be?"
 *
 * One row per pocket: a target marker, a filled bar for the actual reading,
 * and a direct variance label — no legend needed, no tooltip required to
 * read the primary values.
 */

export type PocheAllocation = {
  readonly poche: string
  readonly cible: number
  readonly reel: number | null
}

export function AllocationChart({ poches }: Readonly<{ poches: readonly PocheAllocation[] }>) {
  const lisibles = poches.filter((p) => p.reel !== null)

  if (lisibles.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No pocket balance could be read on-chain. Nothing is plotted rather than a zeroed-out split.
      </p>
    )
  }

  return (
    <ul className="space-y-5 px-2 py-4">
      {lisibles.map((p) => {
        const actual = p.reel as number
        const variance = actual - p.cible
        const onTarget = Math.abs(variance) < 0.5
        const barColor = onTarget ? 'bg-accent-500' : 'bg-warning-400'
        const varianceColor = onTarget ? 'text-zinc-500 dark:text-zinc-400' : 'text-warning-400'

        return (
          <li key={p.poche} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-zinc-950 dark:text-white">{p.poche}</span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatPercent(actual)}{' '}
                <span className="text-zinc-400 dark:text-zinc-600">/ target {formatPercent(p.cible)}</span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
              <div
                className={clsx('h-full rounded-full transition-[width]', barColor)}
                style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-zinc-950 dark:bg-white"
                style={{ left: `${Math.min(100, Math.max(0, p.cible))}%` }}
              />
            </div>
            <p className={clsx('text-xs tabular-nums', varianceColor)}>
              {formatPercent(variance, { signed: true, maximumFractionDigits: 1 })} vs target
            </p>
          </li>
        )
      })}
    </ul>
  )
}
