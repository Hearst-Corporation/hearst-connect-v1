'use client'

import {
  chartTheme,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow, tooltipPoint } from '@/components/charts/richart/_shared/chart-tooltip'
import { ChartViewportEmpty, sortByLabelTime, useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — dual-axis chart for vault AUM + cbBTC allocation %.
 *
 * Left axis: AUM in USDC (area, mint).
 * Right axis: cbBTC % (line, neutral reference).
 *
 * Both series share the same time axis. Never `ResponsiveContainer`
 * — explicit ResizeObserver width like all other richart components.
 */

export type AumCbbtcPoint = {
  readonly label: string
  readonly aum: number
  readonly cbbtcPct: number
  readonly usdcPct: number
  readonly detail: string
}

const AUM_COLOR = chartTheme.dataSeries.brandPrimary
const CBBTC_COLOR = chartTheme.dataSeries.brandSecondary
const USDC_COLOR = chartTheme.dataSeries.dataReference

function DualTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: AumCbbtcPoint; dataKey?: string; value?: number }[]
}>) {
  const point = tooltipPoint(active, payload)
  if (point === null) return null

  return (
    <ChartTooltipShell title={point.detail}>
      <TooltipRow first label="AUM" value={`$${formatNumber(point.aum, { maximumFractionDigits: 0 })}`} />
      <TooltipRow
        label="cbBTC"
        value={`${formatNumber(point.cbbtcPct, { maximumFractionDigits: 2 })}%`}
        color={CBBTC_COLOR}
      />
      <TooltipRow
        label="USDC"
        value={`${formatNumber(point.usdcPct, { maximumFractionDigits: 2 })}%`}
        color={USDC_COLOR}
      />
    </ChartTooltipShell>
  )
}

export function VaultAumCbbtcChart({
  points,
  height,
  viewport,
  rebalanceDates,
}: Readonly<{
  points: readonly AumCbbtcPoint[]
  height?: number
  viewport?: ChartViewportRole
  rebalanceDates?: readonly string[]
}>) {
  // Hooks must run unconditionally — call before any early return (rules-of-hooks).
  const { ref, width, viewportHeight } = useChartViewport({ height, viewport, kind: 'line' })

  if (points.length === 0) {
    return <ChartViewportEmpty viewportHeight={viewportHeight} message="No data points for this period." />
  }

  const sorted = sortByLabelTime(points)
  const data = sorted.map((p) => ({ ...p }))

  return (
    <div className="min-w-0">
      <ChartAccessibilityTable
        caption="Vault AUM and allocation over time"
        columns={['Date', 'AUM (USDC)', 'cbBTC %', 'USDC %']}
        rows={sorted.map((p) => ({
          key: p.label,
          label: p.detail,
          cells: [
            formatNumber(p.aum, { maximumFractionDigits: 0 }),
            `${formatNumber(p.cbbtcPct, { maximumFractionDigits: 2 })}%`,
            `${formatNumber(p.usdcPct, { maximumFractionDigits: 2 })}%`,
          ],
        }))}
      />

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: viewportHeight }}>
        {width > 0 ? (
          <ComposedChart
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
            {rebalanceDates?.map((date) => (
              <ReferenceLine
                key={date}
                x={date}
                stroke={chartTheme.semantic.warning}
                strokeDasharray="3 3"
                strokeWidth={1}
                yAxisId="left"
              />
            ))}
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => `$${formatNumber(v / 1_000_000, { maximumFractionDigits: 1 })}M`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `${formatNumber(v, { maximumFractionDigits: 0 })}%`}
            />
            <Tooltip content={<DualTooltip />} cursor={{ stroke: chartTheme.cursor }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="aum"
              name="AUM"
              stroke={AUM_COLOR}
              fill={AUM_COLOR}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 2, fill: AUM_COLOR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cbbtcPct"
              name="cbBTC %"
              stroke={CBBTC_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: CBBTC_COLOR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="usdcPct"
              name="USDC %"
              stroke={USDC_COLOR}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: USDC_COLOR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        ) : null}
      </div>
    </div>
  )
}
