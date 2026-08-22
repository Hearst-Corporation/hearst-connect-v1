'use client'

import { CHART_VIEWPORT_PX, categoricalColor } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { formatNumber } from '@/lib/format'

/**
 * richart — categorical breakdown donut (KYC, allocation mix…).
 *
 * Pure CSS `conic-gradient` ring — no chart engine: the ring is crisp at any
 * size and never paints late. Values live in the legend rows; the center
 * carries the total. An all-zero breakdown is a named absence, never a
 * fabricated "0" over an empty ring.
 */

export type DonutSlice = {
  readonly label: string
  readonly value: number
}

/** Matches `--chart-donut-viewport-max-inline-size`. */
const DONUT_MAX_INLINE_PX = 260
const DONUT_BLOCK_PX = CHART_VIEWPORT_PX.donut

function conicGradient(slices: readonly { fill: string; value: number }[], total: number): string {
  let acc = 0
  const stops: string[] = []
  for (const s of slices) {
    const from = (acc / total) * 360
    acc += s.value
    const to = (acc / total) * 360
    stops.push(`${s.fill} ${from.toFixed(2)}deg ${to.toFixed(2)}deg`)
  }
  return `conic-gradient(${stops.join(', ')})`
}

export function HearstDonutChart({
  slices,
  unit = 'dossiers',
}: Readonly<{ slices: readonly DonutSlice[]; unit?: string }>) {
  const data = slices
    .filter((s) => s.value > 0)
    .map((s, index) => ({ ...s, fill: categoricalColor(index) }))
  const total = data.reduce((sum, s) => sum + s.value, 0)

  if (data.length === 0) {
    return <p className="px-5 pb-5 text-sm text-fg-secondary">Nothing to break down yet.</p>
  }

  return (
    <div className="px-5 pb-5 sm:px-6">
      <ChartAccessibilityTable
        caption={`Breakdown (${unit})`}
        columns={['Category', 'Value']}
        rows={data.map((s) => ({
          key: s.label,
          label: s.label,
          cells: [formatNumber(s.value)],
        }))}
      />

      <div
        aria-hidden="true"
        className="relative mx-auto w-full"
        style={{ maxWidth: DONUT_MAX_INLINE_PX, height: DONUT_BLOCK_PX }}
        data-chart-viewport={DONUT_BLOCK_PX}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full"
            style={{
              width: '82%',
              height: '82%',
              background: conicGradient(data, total),
              WebkitMask: 'radial-gradient(closest-side, transparent 62%, black 63%)',
              mask: 'radial-gradient(closest-side, transparent 62%, black 63%)',
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink dark:text-fg">
            {formatNumber(total)}
          </span>
          <span className="text-[11px] text-fg-tertiary">{unit}</span>
        </div>
      </div>

      <ul aria-hidden="true" className="mt-3 flex flex-col gap-1.5">
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs text-console-fill dark:text-fg">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.fill }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto tabular-nums font-medium text-ink dark:text-fg">
              {formatNumber(s.value)}
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums text-fg-tertiary">
              {formatNumber((s.value / total) * 100, { maximumFractionDigits: 1 })}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
