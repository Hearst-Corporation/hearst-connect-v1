'use client'

import { CHART_SPARK_VIEWPORT_PX, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { useId } from 'react'
import { Area, AreaChart } from 'recharts'

/**
 * richart — dense sparkline for KPI tiles.
 * Component-level viewport (not a page role). Renders nothing below 2 points.
 * Measured px like every richart chart — a KPI tile is a flex cell, where
 * `ResponsiveContainer` collapses to a 0×0 wrapper.
 */

export function RichSparkline({
  data,
  color = chartTheme.dataSeries.brandPrimary,
  height = CHART_SPARK_VIEWPORT_PX,
}: Readonly<{
  data: number[]
  color?: string
  height?: number
}>) {
  // Hooks before the early return (rules-of-hooks).
  const { ref, width } = useChartWidth()
  const gradientId = useId()

  if (data.length < 2) return null

  const series = data.map((value, i) => ({ i, value }))

  return (
    <div ref={ref} className="w-full min-w-0" style={{ height }} aria-hidden="true">
      {width > 0 ? (
        <AreaChart width={width} height={height} data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      ) : null}
    </div>
  )
}
