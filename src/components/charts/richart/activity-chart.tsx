'use client'

import {
  chartTheme,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — activity per period (vertical bars).
 *
 * Rebuilt with Recharts using measured PX dimensions (ResizeObserver) —
 * never `ResponsiveContainer` % inside a flex (0×0 wrapper).
 *
 * Bars, never a line: each point is a closed count / amount for a given
 * bucket. A line would invent a slope between two unmeasured buckets.
 */

export type ActivityPoint = {
  readonly label: string
  readonly value: number
  readonly detail: string
}

const SERIE = chartTheme.dataSeries.brandPrimary

function barCategoryGapForCount(count: number): string {
  if (count <= 4) return '10%'
  if (count <= 8) return '18%'
  return '28%'
}

function maxBarSizeForCount(count: number): number {
  // ≤24px mark spec — thin columns with air, consistent with signed-bar-chart.
  if (count <= 4) return 24
  if (count <= 8) return 22
  return 20
}

export function HearstActivityChart({
  points,
  unit,
  color = SERIE,
  height,
  viewport,
  yTickFormatter,
}: Readonly<{
  points: readonly ActivityPoint[]
  unit: string
  color?: string
  height?: number
  viewport?: ChartViewportRole
  /** Graduations de l'axe Y. Sans lui, un montant à six chiffres se coupait
   *  dans les 40px de l'axe (« 00,000 »). */
  yTickFormatter?: (v: number) => string
}>) {
  const count = points.length
  const { ref, width, viewportHeight } = useChartViewport({ height, viewport, kind: 'columns' })
  const barCategoryGap = barCategoryGapForCount(count)
  const maxBarSize = maxBarSizeForCount(count)
  const data = points.map((p) => ({
    label: p.label,
    value: p.value,
    detail: p.detail,
  }))

  return (
    <div className="min-w-0">
      <ChartAccessibilityTable
        caption={`Activity by period, in ${unit}`}
        columns={['Period', `Value (${unit})`]}
        rows={points.map((p) => ({
          key: p.detail,
          label: p.detail,
          cells: [formatNumber(p.value)],
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
          <BarChart
            width={width}
            height={viewportHeight}
            data={data}
            margin={{ ...chartTheme.margin, right: 12, left: 0 }}
            barCategoryGap={barCategoryGap}
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
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={yTickFormatter === undefined ? 40 : 56}
              /* Décimales permises dès qu'un format est fourni : sur des mois
                 à moins d'un BTC, l'axe entier montait à 4 et écrasait les barres. */
              allowDecimals={yTickFormatter !== undefined}
              tickFormatter={yTickFormatter ?? ((v: number) => formatNumber(v, { maximumFractionDigits: 0 }))}
            />
            <Tooltip
              content={<RichTooltip unit={unit} />}
              cursor={{ fill: chartTheme.cursor }}
              // Recharts reads `label` / `detail` from the payload — we expose the
              // human-readable period via the X label (dataKey label).
            />
            <Bar
              dataKey="value"
              name={unit}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            />
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
