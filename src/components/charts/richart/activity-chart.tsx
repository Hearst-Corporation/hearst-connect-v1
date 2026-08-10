'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
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
  if (count <= 4) return 80
  if (count <= 8) return 56
  return 40
}

export function HearstActivityChart({
  points,
  unit,
  color = SERIE,
  height,
}: Readonly<{ points: readonly ActivityPoint[]; unit: string; color?: string; height?: number }>) {
  const count = points.length
  const viewportHeight = height ?? chartHeight('columns', Math.max(count, 1))
  const { ref, width } = useChartWidth()
  const barCategoryGap = barCategoryGapForCount(count)
  const maxBarSize = maxBarSizeForCount(count)
  // Under ~28px per bucket, force Recharts to skip ticks instead of overlapping.
  const minPxPerBucket = 28
  const xInterval =
    width > 0 && count * minPxPerBucket > width ? ('preserveStartEnd' as const) : (0 as const)
  const data = points.map((p) => ({
    label: p.label,
    value: p.value,
    detail: p.detail,
  }))

  return (
    <div className="min-w-0">
      <div className="sr-only">
        <table>
          <caption>Activity by period, in {unit}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Value ({unit})</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.detail}>
                <th scope="row">{p.detail}</th>
                <td>{formatNumber(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: viewportHeight }}>
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
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
              tickFormatter={(v: number) => formatNumber(v, { maximumFractionDigits: 0 })}
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
