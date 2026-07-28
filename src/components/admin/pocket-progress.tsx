import { formatPercent } from '@/lib/format'

/**
 * Target vs. actual for one strategic pocket, on ONE track.
 *
 * ── What this replaced ───────────────────────────────────────────────────
 * Two full-width bars, a legend, and two caption lines — five pieces of
 * furniture for a single pair of numbers, repeated once per pocket in a
 * list. The double bar also read as two independent quantities rather than
 * one measurement against one reference.
 *
 * The encoding is now the console's shared grammar, the same one
 * `AllocationChart` and `CapacityBar` use: the mint fill is the MEASUREMENT
 * (the share actually held), the neutral tick is the REFERENCE (the target).
 * One line of numbers above, one caption below, nothing else.
 *
 * ── An unreadable share draws no bar ─────────────────────────────────────
 * When the actual share can't be read, no fill is drawn at all. A zero-width
 * mint bar would read as "this pocket holds 0%", which is a claim the data
 * does not support.
 */
export function PocketProgress({
  name,
  cible,
  reel,
  showName = true,
}: Readonly<{
  name: string
  /** Target percentage (0–100). */
  cible: number
  /** Actual percentage, or null if unreadable. */
  reel: number | null
  showName?: boolean
}>) {
  const ciblePct = Math.min(100, Math.max(0, cible))
  const reelPct = reel === null || !Number.isFinite(reel) ? null : Math.min(100, Math.max(0, reel))
  const fmt = (n: number | null) => formatPercent(n, { maximumFractionDigits: 1 })

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        {showName ? (
          <span className="font-medium text-zinc-950 dark:text-white">{name}</span>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">Allocation</span>
        )}
        <span className="font-medium text-zinc-950 tabular-nums dark:text-white">{fmt(reel)}</span>
      </div>

      <div className="relative h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
        {reelPct === null ? null : (
          <div
            className="h-full rounded-full bg-accent-600 dark:bg-accent-400"
            style={{ width: `${reelPct}%` }}
          />
        )}
        {/* Taller than the track so its ends always land on the surface
            behind, and stay legible where they cross the mint fill. */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500 dark:bg-zinc-400"
          style={{ left: `${ciblePct}%` }}
        />
      </div>

      <p className="text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
        {reelPct === null ? 'Actual share not readable on-chain' : `Target ${fmt(cible)}`}
      </p>
    </div>
  )
}

/**
 * States the encoding above, once, for a whole list of pockets — which is
 * why each row no longer repeats it. It must stay in step with
 * `PocketProgress`: mint fill = measurement, neutral tick = reference.
 */
export function PocketProgressLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-accent-600 dark:bg-accent-400" aria-hidden="true" />
        Actual share
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full bg-zinc-500 dark:bg-zinc-400" aria-hidden="true" />
        Target share
      </span>
    </div>
  )
}
