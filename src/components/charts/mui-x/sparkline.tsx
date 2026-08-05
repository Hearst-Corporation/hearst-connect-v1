'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'

/**
 * MUI X Charts Adapter for Sparklines.
 * 
 * Provides a dense trend visualization for KPI tiles.
 */

export function MuiSparkline({
  data,
  color = chartTheme.dataSeries.brandPrimary,
  height = 32,
}: Readonly<{
  data: number[]
  color?: string
  height?: number
}>) {
  if (data.length < 2) return null

  return (
    <div className="w-full" style={{ height }}>
      <SparkLineChart
        data={data}
        color={color}
        height={height}
        showTooltip
        showHighlight
        sx={{
          background: 'transparent',
          '& .MuiAreaElement-root': {
            fillOpacity: 0.1,
          },
        }}
        area
      />
    </div>
  )
}
