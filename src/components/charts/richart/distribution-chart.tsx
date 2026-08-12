'use client'

import { categoricalColor, resolveChartViewport, chartTheme } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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
  const sortedItems = [...items]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({ ...item, fill: categoricalColor(index) }))
  const height = resolveChartViewport({ kind: 'rows' })

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Distribution{unit === '' ? '' : ` (${unit})`}</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                <td>
                  {formatNumber(item.value)}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
        </ResponsiveContainer>
      </div>
    </div>
  )
}
