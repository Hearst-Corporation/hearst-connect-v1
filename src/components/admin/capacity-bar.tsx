import { formatPercent } from '@/lib/format'
import clsx from 'clsx'

/**
 * "How much of the cap is already committed?"
 *
 * A horizontal bar rather than a circular gauge: the cap is a linear limit,
 * and the eye compares two lengths better than two arcs. The figure is
 * written next to it — the bar illustrates it, it doesn't replace it.
 *
 * Same grammar, same proportions as `AllocationChart` and `PocketProgress`:
 * one 8px track, mint fill for the measurement, neutral track for what it is
 * measured against. Here the reference is the cap itself, so it IS the full
 * track — no extra marker is needed to point at it.
 *
 * ── Where color is spent ─────────────────────────────────────────────────
 * The ordinary case is not an event: comfortable capacity gets a mint bar
 * and a neutral word, not a bright green congratulation. Past 75% the WORD
 * turns amber while the bar stays mint — sustained use is worth reading, not
 * an alarm. Only past 90%, when the remaining capacity genuinely becomes a
 * decision, does the bar itself turn red. Both thresholds are written into
 * the sentence they color, so a reader who can't tell the shades apart gets
 * the same rule.
 */

/** Past this share of the cap, utilization is sustained enough to mention. */
const SEUIL_SOUTENU_PCT = 75
/** Past this share, the remaining capacity stops being an observation. */
const SEUIL_TENDU_PCT = 90

export function CapacityBar({
  utiliseBps,
  disponible,
  total,
}: Readonly<{ utiliseBps: number | null; disponible: string; total: string }>) {
  if (utiliseBps === null || !Number.isFinite(utiliseBps)) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        The utilization rate could not be read. No bar is drawn rather than a bar at zero.
      </p>
    )
  }

  const percent = utiliseBps / 100
  const width = Math.min(100, Math.max(0, percent))
  const tendu = percent >= SEUIL_TENDU_PCT
  const soutenu = percent >= SEUIL_SOUTENU_PCT && percent < SEUIL_TENDU_PCT

  let toneText = 'text-zinc-500 dark:text-zinc-400'
  let toneMessage = 'Comfortable capacity'
  let toneBar = 'bg-accent-600 dark:bg-accent-400'
  if (tendu) {
    toneText = 'text-danger-600 dark:text-danger-400'
    toneMessage = `Capacity nearly reached — past ${SEUIL_TENDU_PCT}% of the cap`
    toneBar = 'bg-danger-500'
  } else if (soutenu) {
    toneText = 'text-warning-600 dark:text-warning-400'
    toneMessage = `Sustained utilization — past ${SEUIL_SOUTENU_PCT}% of the cap`
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-2xl font-semibold text-zinc-950 tabular-nums dark:text-white">
          {formatPercent(utiliseBps, { fromBps: true, maximumFractionDigits: 2 })}
        </p>
        <p className={clsx('text-xs font-medium', toneText)}>{toneMessage}</p>
      </div>

      <div
        role="img"
        aria-label={`Cap used at ${percent.toFixed(2)} percent`}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
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
