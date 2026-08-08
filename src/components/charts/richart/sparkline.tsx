'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

/**
 * richart — sparkline dense pour tuiles KPI.
 * Ne rend rien en dessous de 2 points (pas de pente inventée).
 */

export function RichSparkline({
  data,
  color = chartTheme.dataSeries.brandPrimary,
  height = 32,
}: Readonly<{
  data: number[]
  color?: string
  height?: number
}>) {
  if (data.length < 2) return null

  const series = data.map((value, i) => ({ i, value }))
  const gradientId = 'richart-spark-fill'

  return (
    <div className="w-full" style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
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
      </ResponsiveContainer>
    </div>
  )
}
