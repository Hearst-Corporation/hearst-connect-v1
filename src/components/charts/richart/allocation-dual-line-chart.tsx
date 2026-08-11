'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
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
const SURFACE_RING = 'var(--color-console-surface)'

function AllocationTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: AllocationPoint }[]
}>) {
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{point.detail}</p>
      <p className="mt-1 tabular-nums text-fg-tertiary dark:text-fg-secondary">
        cbBTC: {formatNumber(point.cbbtcPct, { maximumFractionDigits: 2 })}%
      </p>
      <p className="mt-0.5 tabular-nums text-fg-tertiary dark:text-fg-secondary">
        USDC: {formatNumber(point.usdcPct, { maximumFractionDigits: 2 })}%
      </p>
    </div>
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
}: Readonly<{
  points: readonly AllocationPoint[]
  height?: number
}>) {
  // Hooks must run unconditionally — call before any early return (rules-of-hooks).
  const { ref, width } = useChartWidth()

  if (points.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No data points for this period.
      </p>
    )
  }

  const sorted = [...points].sort((a, b) => +new Date(a.label) - +new Date(b.label))
  const data = sorted.map((p) => ({ ...p }))
  const viewportHeight = height ?? chartHeight('line', Math.max(data.length, 1))

  return (
    <div className="min-w-0">
      <div className="sr-only">
        <table>
          <caption>Allocation percentages over time</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">cbBTC %</th>
              <th scope="col">USDC %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.detail}</th>
                <td>{formatNumber(p.cbbtcPct, { maximumFractionDigits: 2 })}%</td>
                <td>{formatNumber(p.usdcPct, { maximumFractionDigits: 2 })}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AllocationLegend />

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: viewportHeight }}>
        {width > 0 ? (
          <LineChart
            width={width}
            height={viewportHeight}
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
