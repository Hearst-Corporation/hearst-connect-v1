'use client'

import { motion } from 'motion/react'

/**
 * Target / actual double bar, applied to strategic pockets (bps → %).
 */
export function PocketProgress({
  name,
  cible,
  reel,
  showName = true,
}: Readonly<{
  name: string
  /** Pourcentage cible (0–100). */
  cible: number
  /** Pourcentage constaté, ou null si illisible. */
  reel: number | null
  showName?: boolean
}>) {
  const ciblePct = Math.min(100, Math.max(0, cible))
  const reelPct = reel === null ? 0 : Math.min(100, Math.max(0, reel))
  const fmt = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        {showName ? (
          <span className="font-medium text-zinc-950 dark:text-white">{name}</span>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">Allocation</span>
        )}
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
          {reel === null ? '—' : fmt(reel)} / {fmt(cible)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-zinc-500"
          initial={{ width: 0 }}
          animate={{ width: `${ciblePct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-accent-600 dark:bg-accent-500"
          initial={{ width: 0 }}
          animate={{ width: `${reelPct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span>Cible {fmt(cible)}</span>
        <span>Constatée {reel === null ? 'non lisible' : fmt(reel)}</span>
      </div>
    </div>
  )
}

export function PocketProgressLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-zinc-500" aria-hidden />
        Allocation cible
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-accent-600 dark:bg-accent-500" aria-hidden />
        Allocation constatée
      </span>
    </div>
  )
}
