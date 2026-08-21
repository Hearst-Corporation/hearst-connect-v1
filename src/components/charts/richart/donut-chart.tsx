'use client'

import { CHART_VIEWPORT_PX, categoricalColor } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Pie, PieChart, Tooltip } from 'recharts'

/**
 * richart — categorical breakdown donut (KYC, etc.).
 * Recharts engine behind the charts boundary — never imported from a route.
 *
 * Measured PX like every richart chart (ResizeObserver) — never
 * `ResponsiveContainer`: its % wrapper collapses to a 0×0 intermediate box
 * (`width:0; height:0; overflow:visible`) inside flex cells and the ring
 * paints late or never. The donut keeps its role viewport (220px block,
 * 260px max inline, centered) — a ring does not stretch.
 */

export type DonutSlice = {
  readonly label: string
  readonly value: number
}

/** Matches `--chart-donut-viewport-max-inline-size` (breakdown-donut / exposure-radial still read the var). */
const DONUT_MAX_INLINE_PX = 260
const DONUT_BLOCK_PX = CHART_VIEWPORT_PX.donut

export function HearstDonutChart({
  slices,
  unit = 'dossiers',
}: Readonly<{ slices: readonly DonutSlice[]; unit?: string }>) {
  const { ref, width } = useChartWidth()
  const data = slices
    .filter((s) => s.value > 0)
    .map((s, index) => ({ ...s, fill: categoricalColor(index) }))
  const total = data.reduce((sum, s) => sum + s.value, 0)

  // All-zero breakdown: a named absence, never a fabricated "0" over an empty ring.
  if (data.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-secondary">
        Nothing to break down yet.
      </p>
    )
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
        ref={ref}
        aria-hidden="true"
        className="relative mx-auto w-full"
        style={{ maxWidth: DONUT_MAX_INLINE_PX, height: DONUT_BLOCK_PX }}
        data-chart-viewport={DONUT_BLOCK_PX}
      >
        {width > 0 ? (
          <PieChart width={width} height={DONUT_BLOCK_PX}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            />
            <Tooltip content={<RichTooltip unit={unit} />} />
          </PieChart>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink dark:text-fg">
            {formatNumber(total)}
          </span>
          <span className="text-[11px] text-fg-tertiary">{unit}</span>
        </div>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs text-console-fill dark:text-fg">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: s.fill }}
              aria-hidden="true"
            />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto tabular-nums font-medium text-ink dark:text-fg">
              {formatNumber(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
