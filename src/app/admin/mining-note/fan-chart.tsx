'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { CartesianGrid, Area, AreaChart, Line, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Monte-Carlo fan chart — the p5–p95 and p25–p75 price BANDS (structured
 * bases + deltas) and the p50 median PRICE path. All values are BTC PRICE
 * (see §3 of MINING_NOTE_FRONTEND.md — a very common mistake is to read the
 * bands as note value).
 */

export type FanRow = {
  readonly month: number
  readonly p5: number
  readonly p25: number
  readonly p50: number
  readonly p75: number
  readonly p95: number
}

const RANGE = chartTheme.dataSeries.brandPrimary
const MEDIAN = chartTheme.dataSeries.brandPrimary

function FanTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: FanRow & Record<string, number> }[]
}>) {
  if (!active || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  return (
    <ChartTooltipShell title={`Month ${row.month}`}>
      <TooltipRow first label="p95" value={`$${formatNumber(row.p95, { maximumFractionDigits: 0 })}`} />
      <TooltipRow label="p75" value={`$${formatNumber(row.p75, { maximumFractionDigits: 0 })}`} />
      <TooltipRow label="median" value={`$${formatNumber(row.p50, { maximumFractionDigits: 0 })}`} />
      <TooltipRow label="p25" value={`$${formatNumber(row.p25, { maximumFractionDigits: 0 })}`} />
      <TooltipRow label="p5" value={`$${formatNumber(row.p5, { maximumFractionDigits: 0 })}`} />
    </ChartTooltipShell>
  )
}

export function FanChart({ rows }: Readonly<{ rows: readonly FanRow[] }>) {
  const { ref, width, viewportHeight } = useChartViewport({ kind: 'line' })

  if (rows.length === 0) {
    // Keep the measured div mounted: the observer must survive until the first
    // run arrives, otherwise the chart never re-renders (the empty state was
    // consuming the ref's slot).
    return (
      <div ref={ref} style={{ height: viewportHeight }} data-chart-viewport={viewportHeight}>
        <div className="flex h-full w-full items-center justify-center px-5 text-sm text-fg-tertiary">
          Run a Monte-Carlo simulation to see the fan.
        </div>
      </div>
    )
  }

  // Structured bands: transparent bases + deltas, stacked.
  const data = rows.map((r) => ({
    ...r,
    bandWideDelta: r.p95 - r.p5,
    bandInnerBase: r.p25,
    bandInnerDelta: r.p75 - r.p25,
  }))

  return (
    <div className="min-w-0">
      <ChartAccessibilityTable
        caption="BTC price percentiles over months (p5, p25, p50, p75, p95)"
        columns={['Month', 'p5', 'p25', 'p50', 'p75', 'p95']}
        rows={rows.map((r) => ({
          key: String(r.month),
          label: `Month ${r.month}`,
          cells: [r.p5, r.p25, r.p50, r.p75, r.p95].map(
            (v) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`,
          ),
        }))}
      />

      <div
        ref={ref}
        aria-hidden="true"
        className="w-full min-w-0"
        style={{ height: viewportHeight }}
        data-chart-viewport={viewportHeight}
      >
        {width > 0 ? (
          <AreaChart
            width={width}
            height={viewportHeight}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
          >
            <CartesianGrid stroke={chartTheme.grid} strokeOpacity={chartTheme.gridOpacity} vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              minTickGap={44}
              tickMargin={8}
              tickFormatter={(m: number) => `M${m}`}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={72}
              tickCount={5}
              tickFormatter={(v: number) => `$${formatNumber(v, { notation: 'compact', maximumFractionDigits: 1 })}`}
            />
            <Tooltip content={<FanTooltip />} cursor={{ stroke: chartTheme.cursor, strokeWidth: 1.5 }} />
            {/* Base for the wide band — invisible, carries the stack. */}
            <Area
              type="monotone"
              dataKey="p5"
              stroke="none"
              fill="none"
              stackId="band-wide"
              isAnimationActive={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="bandWideDelta"
              name="p5–p95"
              stackId="band-wide"
              stroke="none"
              fill={RANGE}
              fillOpacity={0.12}
              isAnimationActive={false}
              connectNulls
            />
            {/* Base for the inner band — stacks on the layer below. */}
            <Area
              type="monotone"
              dataKey="bandInnerBase"
              stroke="none"
              fill="none"
              stackId="band-inner"
              isAnimationActive={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="bandInnerDelta"
              name="p25–p75"
              stackId="band-inner"
              stroke="none"
              fill={RANGE}
              fillOpacity={0.22}
              isAnimationActive={false}
              connectNulls
            />
            {/* Median path. */}
            <Line
              type="monotone"
              dataKey="p50"
              name="median"
              stroke={MEDIAN}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, fill: MEDIAN, stroke: chartTheme.plotSurface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        ) : null}
      </div>
    </div>
  )
}
