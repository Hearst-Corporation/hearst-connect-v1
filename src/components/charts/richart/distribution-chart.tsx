'use client'

import { categoricalColor, chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — horizontal distribution sorted in descending order.
 * The first category carries the accent; the following ones use the neutral ramp.
 */

export type DistributionItem = {
  readonly label: string
  readonly value: number
}

export function RichDistributionChart({
  items,
  unit = '',
}: Readonly<{ items: readonly DistributionItem[]; unit?: string }>) {
  const { ref, width, viewportHeight } = useChartViewport({ kind: 'rows' })
  const sortedItems = [...items]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({ ...item, fill: categoricalColor(index) }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <ChartAccessibilityTable
        caption={`Distribution${unit === '' ? '' : ` (${unit})`}`}
        columns={['Category', 'Value']}
        rows={sortedItems.map((item) => ({
          key: item.label,
          label: item.label,
          cells: [`${formatNumber(item.value)}${unit}`],
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
            data={sortedItems}
            layout="vertical"
            margin={{ ...chartTheme.margin, left: 8, right: 24 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<RichTooltip unit={unit.trim()} />} cursor={{ fill: chartTheme.cursor }} />
            <Bar dataKey="value" name="Value" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
