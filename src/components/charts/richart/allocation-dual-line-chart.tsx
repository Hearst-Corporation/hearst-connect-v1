'use client'

import {
  resolveChartViewport,
  chartTheme,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { useChartSize } from '@/components/charts/core/use-chart-width'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow, tooltipPoint } from '@/components/charts/richart/_shared/chart-tooltip'
import { ChartViewportEmpty, sortByLabelTime } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — two-line chart for cbBTC and USDC allocation percentages.
 *
 * Both series share the same Y-axis (percent) — one axis, never two scales.
 * Mint carries the volatile asset (cbBTC), neutral grey the stable reference
 * (USDC): identity is mint-vs-grey, so a LEGEND is always present (dataviz
 * non-negotiable for ≥2 series) and doubles as the secondary encoding the
 * emphasis palette requires. No per-point dots — crosshair + ringed active
 * dots on hover; x-axis skips ticks instead of overlapping.
 */

export type AllocationPoint = {
  readonly label: string
  readonly cbbtcPct: number
  readonly usdcPct: number
  readonly detail: string
}

const CBBTC_COLOR = chartTheme.dataSeries.brandPrimary
const USDC_COLOR = chartTheme.dataSeries.dataReference
const SURFACE_RING = chartTheme.plotSurface

function AllocationTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: AllocationPoint }[]
}>) {
  const point = tooltipPoint(active, payload)
  if (point === null) return null

  return (
    <ChartTooltipShell title={point.detail}>
      <TooltipRow first label="cbBTC" value={`${formatNumber(point.cbbtcPct, { maximumFractionDigits: 2 })}%`} />
      <TooltipRow label="USDC" value={`${formatNumber(point.usdcPct, { maximumFractionDigits: 2 })}%`} />
    </ChartTooltipShell>
  )
}

/** HTML legend — a swatch beside text-token labels, never colored text. */
function AllocationLegend() {
  return (
    <ul className="mb-2 flex items-center gap-4 px-1 text-xs text-fg-tertiary dark:text-fg-secondary">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: CBBTC_COLOR }} />
        cbBTC
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: USDC_COLOR }} />
        USDC
      </li>
    </ul>
  )
}

export function AllocationDualLineChart({
  points,
  height,
  viewport,
}: Readonly<{
  points: readonly AllocationPoint[]
  height?: number
  viewport?: ChartViewportRole
}>) {
  // Hooks must run unconditionally — call before any early return (rules-of-hooks).
  // Measure the plot slot (width + height): the legend takes its intrinsic
  // height and the plot fills the flex remainder, so legend + plot together
  // equal `viewportHeight` exactly — a second series never adds height to the slot.
  const { ref, width, height: plotHeight } = useChartSize()
  const viewportHeight = resolveChartViewport({ height, viewport, kind: 'line' })

  if (points.length === 0) {
    return <ChartViewportEmpty viewportHeight={viewportHeight} message="No data points for this period." />
  }

  const sorted = sortByLabelTime(points)
  const data = sorted.map((p) => ({ ...p }))

  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ height: viewportHeight }}
      data-chart-viewport={viewportHeight}
    >
      <ChartAccessibilityTable
        caption="Allocation percentages over time"
        columns={['Date', 'cbBTC %', 'USDC %']}
        rows={sorted.map((p) => ({
          key: p.label,
          label: p.detail,
          cells: [
            `${formatNumber(p.cbbtcPct, { maximumFractionDigits: 2 })}%`,
            `${formatNumber(p.usdcPct, { maximumFractionDigits: 2 })}%`,
          ],
        }))}
      />

      <AllocationLegend />

      <div ref={ref} aria-hidden="true" className="w-full min-w-0 flex-1">
        {width > 0 && plotHeight > 0 ? (
          <LineChart
            width={width}
            height={plotHeight}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
          >
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={44}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickCount={5}
              tickFormatter={(v: number) => `${formatNumber(v, { maximumFractionDigits: 0 })}%`}
            />
            <Tooltip content={<AllocationTooltip />} cursor={{ stroke: chartTheme.cursor, strokeWidth: 1.5 }} />
            <Line
              type="monotone"
              dataKey="cbbtcPct"
              name="cbBTC %"
              stroke={CBBTC_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: CBBTC_COLOR, stroke: SURFACE_RING, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="usdcPct"
              name="USDC %"
              stroke={USDC_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: USDC_COLOR, stroke: SURFACE_RING, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : null}
      </div>
    </div>
  )
}
