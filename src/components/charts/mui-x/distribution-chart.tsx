'use client'

import { categoricalColor, chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { BarChart, barClasses } from '@mui/x-charts/BarChart'
import { axisClasses } from '@mui/x-charts/ChartsAxis'

/**
 * MUI X Charts Adapter for Horizontal Distribution.
 * 
 * Replacing custom div-based bars with a standard, interactive component
 * that respects Hearst tokens and typography.
 */

export type DistributionItem = {
  readonly label: string
  readonly value: number
}

export function MuiDistributionChart({
  items,
  unit = '',
}: Readonly<{ items: readonly DistributionItem[]; unit?: string }>) {
  if (items.length === 0) {
    return <p className="px-5 pb-5 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">Aucune donnée à afficher.</p>
  }

  const sortedItems = [...items].sort((a, b) => b.value - a.value)
  const height = chartHeight('rows', sortedItems.length)

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div style={{ width: '100%', height }}>
        <BarChart
          dataset={sortedItems}
          yAxis={[
            {
              scaleType: 'band',
              dataKey: 'label',
              hideTooltip: true,
            },
          ]}
          series={[
            {
              dataKey: 'value',
              valueFormatter: (v) => (v === null ? '—' : `${formatNumber(v)}${unit}`),
              color: chartTheme.dataSeries.brandPrimary,
            },
          ]}
          layout="horizontal"
          margin={{ left: 100, right: 40, top: 10, bottom: 10 }}
          slotProps={{
            legend: { hidden: true } as any,
          }}
          sx={{
            [`& .${axisClasses.left} .${axisClasses.label}`]: {
              fontSize: chartTheme.axisFontSize,
              fill: chartTheme.tick,
            },
            [`& .${axisClasses.left} .${axisClasses.tickLabel}`]: {
              fontSize: chartTheme.axisFontSize,
              fill: chartTheme.tick,
            },
            [`& .${axisClasses.bottom}`]: {
              display: 'none',
            },
            [`& .${axisClasses.left}`]: {
              display: 'none',
            },
            [`& .${barClasses.root}`]: {
              fill: chartTheme.dataSeries.brandPrimary,
            },
            // Hearst specific: remove background and borders
            background: 'transparent',
          }}
        />
      </div>
    </div>
  )
}
