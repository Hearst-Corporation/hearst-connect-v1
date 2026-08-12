'use client'

import type { ComponentType, SVGProps } from 'react'
import { HearstDonutChart } from '@/components/charts'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { AllocationBar } from './load'

/**
 * BreakdownFlank — an analysis-band side flank: a heading over a real Recharts
 * part-to-whole donut (`HearstDonutChart`, behind the charts boundary — no direct
 * recharts import here).
 *
 * This replaces the former `CompositionRail`, a hand-built flex bar + a ledger
 * whose rows were stretched to fill the panel (`flex:1`) and which printed the
 * same percentage twice (`37.6 / 37.6`). A breakdown is a donut, not a stretched
 * list: the ring carries the proportions, a compact intrinsic legend carries the
 * exact numbers. The donut is honest by construction — a zero bucket draws no
 * slice, and the two named absences (unreadable source vs empty) are preserved.
 *
 * `kind`:
 *   'percent' → values are already percentages → legend shows `value%`, center is
 *               the measured sum (never a hardcoded 100%), no duplicate share.
 *   'count'   → values are counts → legend shows `count` + a `share%` (both mean
 *               different things), center is the total.
 */
export function BreakdownFlank({
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
  kind: 'percent' | 'count'
  unit: string
}>) {
  const raw = valueOf(availability)
  // Rank descending so the leading category takes the mint accent (categoricalColor
  // index 0) and the ring reads largest-first, like the old ranked ledger did.
  const slices = raw !== null ? [...raw].sort((a, b) => b.value - a.value) : null
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
        <div className="flank-empty">
          <span className="empty-mark" />
          <p>{isAvailable(availability) ? 'Nothing to break down yet.' : 'Awaiting a verified source.'}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="flank-panel">
      {heading}
      {/* The donut is intrinsic (fixed viewport) — it does NOT fill the panel.
          It is centered in the space under the heading so a flank shorter than
          the central chart reads as balanced, not as a bottom hole. */}
      <div className="flank-viz">
        <HearstDonutChart
          slices={slices}
          unit={unit}
          format={kind === 'percent' ? 'percent' : 'count'}
          showShare={kind === 'count'}
          bare
        />
      </div>
    </section>
  )
}
