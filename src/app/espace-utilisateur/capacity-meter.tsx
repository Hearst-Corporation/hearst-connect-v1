'use client'

import { motion } from 'motion/react'
import { formatNumber, formatPercent } from '@/lib/format'
import { valueOf } from '@/lib/vaults/model'
import { useMotionReady } from './motion-guard'
import type { UserDashboard } from './load'

/**
 * Capacity meter — a real ARIA meter of vault utilization toward the TVL cap,
 * with an animated accent fill. Single accent, NO severity thresholds (a
 * hardcoded 80/95% band would violate check:truthful-data). Absence is a named
 * state, never a 0% bar.
 */
export function CapacityMeter({
  utilization,
  capacity,
}: Readonly<{
  utilization: UserDashboard['utilizationPct']
  capacity: UserDashboard['availableCapacity']
}>) {
  const animate = useMotionReady()
  const util = valueOf(utilization)

  if (util === null) {
    return (
      <div className="center-state">
        <span className="empty-mark" />
        <p>Capacity source did not resolve — nothing is shown rather than a guess.</p>
      </div>
    )
  }

  const pct = Math.min(100, Math.max(0, util))
  const room = valueOf(capacity)
  const valueText = formatPercent(util, { maximumFractionDigits: 1 })

  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-value">{valueText}</span>
        <span className="meter-label">of the vault cap used</span>
      </div>
      <div
        className="meter-track"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${valueText} of cap used`}
      >
        {animate ? (
          <motion.div
            className="meter-fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ) : (
          <div className="meter-fill" style={{ width: `${pct}%` }} />
        )}
      </div>
      <p className="meter-caption">
        {room !== null
          ? `${formatNumber(room, { maximumFractionDigits: 0 })} USDC room to the cap`
          : 'Headroom to the cap not available'}
      </p>
    </div>
  )
}
