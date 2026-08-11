'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
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
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{point.detail}</p>
      <p className="mt-1 text-fg-tertiary tabular-nums">
        AUM: ${formatNumber(point.aum, { maximumFractionDigits: 0 })}
      </p>
      <p className="mt-0.5 tabular-nums" style={{ color: CBBTC_COLOR }}>
        cbBTC: {formatNumber(point.cbbtcPct, { maximumFractionDigits: 2 })}%
      </p>
      <p className="mt-0.5 tabular-nums" style={{ color: USDC_COLOR }}>
        USDC: {formatNumber(point.usdcPct, { maximumFractionDigits: 2 })}%
      </p>
    </div>
  )
}

export function VaultAumCbbtcChart({
  points,
  height,
  rebalanceDates,
}: Readonly<{
  points: readonly AumCbbtcPoint[]
  height?: number
  rebalanceDates?: readonly string[]
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
          <caption>Vault AUM and allocation over time</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">AUM (USDC)</th>
              <th scope="col">cbBTC %</th>
              <th scope="col">USDC %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.detail}</th>
                <td>{formatNumber(p.aum, { maximumFractionDigits: 0 })}</td>
                <td>{formatNumber(p.cbbtcPct, { maximumFractionDigits: 2 })}%</td>
                <td>{formatNumber(p.usdcPct, { maximumFractionDigits: 2 })}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
