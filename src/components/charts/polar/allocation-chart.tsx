import { formatNumber, formatPercent } from '@/lib/format'
import clsx from 'clsx'

/**
 * "Is the money placed where it should be?"
 *
 * One row per pocket, one track. The mint fill is the MEASUREMENT (the share
 * actually held); the neutral tick is what it is measured against (the
 * target). That pairing — mint for the reading, neutral for the reference —
 * is the same grammar used by `PocketProgress` and `CapacityBar`, so a
 * reader learns it once and it holds across the console.
 *
 * ── Why the bar is no longer colored by drift ────────────────────────────
 * The previous version painted every off-target pocket orange. Three pockets
 * drifting by 0.7 to 2.1 points therefore all screamed "warning", which spent
 * the alarm tone on the ordinary case and left nothing to say with when a
 * pocket genuinely slips. An allocation is ordinary data: the bar stays mint.
 * Only the drift CAPTION changes tone, and only past a threshold that the
 * caption names out loud.
 *
 * Direct labels carry the numbers, so no legend and no tooltip are needed.
 */

/**
 * Gap, in percentage points, from which a pocket's drift is flagged.
 *
 * This is a READING threshold, not a contract rule: the backend exposes no
 * rebalancing tolerance. Because it is a choice, it is written into the
 * caption of every row it colors — a reader can see the rule being applied.
 */
const SEUIL_ECART_SIGNALE_PT = 2

export type PocheAllocation = {
  readonly poche: string
  readonly cible: number
  readonly reel: number | null
}

/** A drift reads signed and in POINTS: "+2.1 pt", the unit used in committee. */
function formatEcartPoints(points: number): string {
  const signe = points > 0 ? '+' : ''
  return `${signe}${formatNumber(points, { maximumFractionDigits: 1 })} pt`
}

function borne(valeur: number): number {
  return Math.min(100, Math.max(0, valeur))
}

export function AllocationChart({ poches }: Readonly<{ poches: readonly PocheAllocation[] }>) {
  const lisibles = poches.filter((p) => p.reel !== null)

  if (lisibles.length === 0) {
    // Stated in one line, aligned with the card header, with no reserved
    // canvas: an absence does not need a viewport-tall box to be believed.
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
        Aucun solde de poche n’a pu être lu on-chain. Rien n’est tracé, plutôt qu’une répartition mise à zéro.
      </p>
    )
  }

  return (
    <ul className="space-y-5 px-5 pb-5 sm:px-6">
      {lisibles.map((p) => {
        const actual = p.reel as number
        const variance = actual - p.cible
        const signale = Math.abs(variance) >= SEUIL_ECART_SIGNALE_PT

        return (
          <li key={p.poche} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-zinc-950 dark:text-white">{p.poche}</span>
              <span className="tabular-nums text-zinc-950 dark:text-white">
                {formatPercent(actual)}{' '}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  / target {formatPercent(p.cible)}
                </span>
              </span>
            </div>

            <div className="relative h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent-600 transition-[width] dark:bg-accent-400"
                style={{ width: `${borne(actual)}%` }}
              />
              {/* The tick stands taller than the track on purpose: where it
                  overlaps the mint fill it would otherwise compete with it,
                  and the protruding ends always sit on the card surface. */}
              <div
                aria-hidden="true"
                className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500 dark:bg-zinc-400"
                style={{ left: `${borne(p.cible)}%` }}
              />
            </div>

            <p
              className={clsx(
                'text-xs tabular-nums',
                signale ? 'text-warning-600 dark:text-warning-400' : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              {formatEcartPoints(variance)} vs target
              {signale ? ` — beyond the ${SEUIL_ECART_SIGNALE_PT} pt reading threshold` : ''}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
