'use client'

import { motion } from 'motion/react'
import type { ComponentType, SVGProps } from 'react'
import { formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { useMotionReady } from './motion-guard'
import type { AllocationBar } from './load'

/**
 * CompositionRail — the donut's replacement. A 100%-stacked token bar over a
 * ranked ledger (swatch · label · value · share). It fills its panel top to
 * bottom and scales with the data, so a flank can never float half-empty again.
 *
 * Honest by construction: shares are computed over a guarded present total
 * (total > 0), never `?? 0`; a zero bucket renders no segment; absence keeps
 * both named branches (unreadable source vs empty). Colors resolve through the
 * `--chart-1..5` ramp tokens — no recharts import, so the charts boundary holds.
 */

const RAMP = [
  'var(--chart-1, var(--color-accent-400))',
  'var(--chart-2, var(--color-fg))',
  'var(--chart-3, var(--color-fg-secondary))',
  'var(--chart-4, var(--color-fg-tertiary))',
  'var(--chart-5, var(--color-console-fill))',
]

export function CompositionRail({
  title,
  hint,
  icon: Icon,
  availability,
  kind,
  unit,
}: Readonly<{
  title: string
  hint: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  availability: Availability<readonly AllocationBar[]>
  /** 'percent' → the value is already a % ; 'count' → the value is a raw count. */
  kind: 'percent' | 'count'
  unit: string
}>) {
  const animate = useMotionReady()
  const slices = valueOf(availability)
  const total = slices !== null ? slices.reduce((sum, s) => sum + s.value, 0) : 0

  const heading = (
    <div className="flank-heading">
      <h2>
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </h2>
      <span>{hint}</span>
    </div>
  )

  if (slices === null || slices.length === 0 || total <= 0) {
    return (
      <section className="flank-panel">
        {heading}
        <div className="rail-empty">
          <span className="empty-mark" />
          <p>{isAvailable(availability) ? 'Nothing to break down yet.' : 'Awaiting a verified source.'}</p>
        </div>
      </section>
    )
  }

  const rows = [...slices]
    .sort((a, b) => b.value - a.value)
    .map((s, index) => ({ ...s, share: s.value / total, color: RAMP[index % RAMP.length] }))

  return (
    <section className="flank-panel">
      {heading}
      <div className="rail-body">
        <p className="rail-total mono">
          {kind === 'count'
            ? `${rows.length} types · ${formatNumber(total)} ${unit}`
            : `${rows.length} buckets · ${formatNumber(total, { maximumFractionDigits: 0 })}%`}
        </p>
        <div className="rail-bar" aria-hidden="true">
          {rows.map((r, index) =>
            animate ? (
              <motion.span
                key={r.label}
                className="rail-seg"
                style={{ background: r.color }}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: r.share }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
              />
            ) : (
              <span key={r.label} className="rail-seg" style={{ background: r.color, flexGrow: r.share }} />
            ),
          )}
        </div>
        <div className="ledger">
          {rows.map((r) => (
            <div className="ledger-row" key={r.label}>
              <span className="ledger-swatch" style={{ background: r.color }} aria-hidden="true" />
              <span className="ledger-label">{r.label}</span>
              <span className="ledger-val mono">
                {kind === 'count' ? formatNumber(r.value) : `${formatNumber(r.value, { maximumFractionDigits: 1 })}%`}
              </span>
              <span className="ledger-share mono">{formatNumber(r.share * 100, { maximumFractionDigits: 1 })}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
