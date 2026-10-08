'use client'

import {
  chartTheme,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { useId } from 'react'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Mining-note — N series on one measured-px cartesian slot.
 *
 * Used to overlay the five preset scenarios and, with two series, the
 * mining-vs-holding comparison. Same hairline/axis canon as the richart
 * single-line chart; categorical colors come from the `--chart-1..5` ramp.
 */

export type SeriesPoint = { readonly month: number; readonly value: number }

export type ChartSeries = {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly points: readonly SeriesPoint[]
  readonly dashed?: boolean
}

export function MultiLineChartTooltip({
  active,
  payload,
  label,
  series,
  unit,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: Record<string, number> }[]
  label?: number
  series: readonly ChartSeries[]
  unit: string
}>) {
  if (!active || payload === undefined || payload.length === 0 || label === undefined) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  return (
    <ChartTooltipShell title={`Month ${label}`}>
      {series.map((s, i) => (
        <TooltipRow
          key={s.id}
          first={i === 0}
          label={s.label}
          color={s.color}
          value={`${formatNumber(row[s.id], { maximumFractionDigits: 0 })} ${unit}`}
        />
      ))}
    </ChartTooltipShell>
  )
}

export function MultiLineChart({
  series,
  unit,
  viewport = 'standard',
  valueStyle = 'plain',
}: Readonly<{
  series: readonly ChartSeries[]
  unit: string
  viewport?: ChartViewportRole
  /**
   * Y-axis + tooltip number style. Named variant instead of a callback so the
   * prop stays serializable when the consumer is a Server Component.
   *   - `plain`         — full number (143,721)
   *   - `compact-dollar`— $-prefixed compact notation ($1.9M)
   */
  valueStyle?: 'plain' | 'compact-dollar'
}>) {
  const { ref, width, viewportHeight } = useChartViewport({ viewport, kind: 'line' })
  const uid = useId()

  const yTickFormatter =
    valueStyle === 'compact-dollar'
      ? (v: number) => `$${formatNumber(v, { notation: 'compact', maximumFractionDigits: 1 })}`
      : undefined

  const monthSet = new Set<number>()
  for (const s of series) for (const p of s.points) monthSet.add(p.month)
  const months = [...monthSet].sort((a, b) => a - b)

  if (months.length === 0 || series.length === 0) {
    // Same rationale as FanChart: keep the measured div mounted.
    return (
      <div ref={ref} style={{ height: viewportHeight }} data-chart-viewport={viewportHeight}>
        <div className="flex h-full w-full items-center justify-center px-5 text-sm text-fg-tertiary">
          No scenario data available.
        </div>
      </div>
    )
  }

  // One row per month; each series' value keyed by series id (sparse-safe).
  const data = months.map((month) => {
    const row: Record<string, number> = { month }
    for (const s of series) {
      const p = s.points.find((pt) => pt.month === month)
      if (p !== undefined) row[s.id] = p.value
    }
    return row
  })

  return (
    <div className="min-w-0" key={uid}>
      <ChartAccessibilityTable
        caption={`${unit} over months, per series`}
        columns={['Month', ...series.map((s) => s.label)]}
        rows={data.map((row) => ({
          key: String(row.month),
          label: `Month ${row.month}`,
          cells: series.map((s) =>
            row[s.id] === undefined
              ? '—'
              : `${formatNumber(row[s.id], { maximumFractionDigits: 2 })} ${unit}`,
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
          <LineChart
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
              interval="preserveStartEnd"
              minTickGap={44}
              tickMargin={8}
              tickFormatter={(m: number) => `M${m}`}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickCount={5}
              tickFormatter={yTickFormatter ?? ((v: number) => formatNumber(v, { maximumFractionDigits: 0 }))}
            />
            <Tooltip
              content={<MultiLineChartTooltip series={series} unit={unit} />}
              cursor={{ stroke: chartTheme.cursor, strokeWidth: 1.5 }}
            />
            {series.map((s) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed === true ? '4 3' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 3.5, fill: s.color, stroke: chartTheme.plotSurface, strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        ) : null}
      </div>
    </div>
  )
}
