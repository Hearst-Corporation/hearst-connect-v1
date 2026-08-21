'use client'

import { chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * richart — stepped rate curve (`stepAfter`).
 *
 * A smoothed spline would invent a rate between two milestones; the product has none.
 */

export type CurvePoint = {
  readonly month: number
  readonly rate: number
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstCurveChart({
  points,
  domainLabel = 'Mois',
}: Readonly<{ points: readonly CurvePoint[]; domainLabel?: string }>) {
  const { ref, width, viewportHeight } = useChartViewport({ kind: 'line' })
  const sorted = [...points].sort((a, b) => a.month - b.month)
  const data = sorted.map((p) => ({
    month: p.month,
    rate: p.rate,
    label: `${domainLabel} ${p.month}`,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <ChartAccessibilityTable
        caption="Yield rate per product milestone month"
        columns={[domainLabel, 'Taux']}
        rows={sorted.map((p) => ({
          key: String(p.month),
          label: `${domainLabel} ${p.month}`,
          cells: [formatChartPercent(p.rate)],
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
          <LineChart width={width} height={viewportHeight} data={data} margin={{ ...chartTheme.margin, right: 16, left: -8 }}>
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
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => formatChartPercent(v)}
            />
            <Tooltip content={<RichTooltip unit="%" />} cursor={{ stroke: chartTheme.cursor }} />
            <Line
              type="stepAfter"
              dataKey="rate"
              name="Taux"
              stroke={SERIE}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIE, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : null}
      </div>
    </div>
  )
}
