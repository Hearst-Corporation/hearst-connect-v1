'use client'

import type { ComponentType, SVGProps } from 'react'
import { HearstBreakdownDonut } from '@/components/charts'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { AllocationBar } from './load'

/**
 * BreakdownFlank — an analysis-band side flank: a heading over a real Recharts
 * part-to-whole donut (`HearstBreakdownDonut`, behind the charts boundary — no
 * direct recharts import here).
 *
 * Replaces the former `CompositionRail`, a hand-built flex bar over a ledger
 * whose rows were stretched to fill the panel (`flex:1`) and which printed the
 * same percentage twice (`37.6 / 37.6`). A breakdown is a donut, not a stretched
 * list: the ring carries the proportions, an intrinsic legend the exact numbers.
 *
 * Absence stays a NAMED absence — the two branches (unreadable source vs empty)
 * are preserved, never collapsed into a fabricated zero.
 */
export function BreakdownFlank({
  title,
  hint,
  icon: Icon,
  availability,
  kind,
  unit,
  centerCaption,
}: Readonly<{
  title: string
  hint: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  availability: Availability<readonly AllocationBar[]>
  kind: 'percent' | 'count'
  unit: string
  centerCaption?: string
}>) {
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
      <HearstBreakdownDonut slices={slices} kind={kind} unit={unit} centerCaption={centerCaption} />
    </section>
  )
}
