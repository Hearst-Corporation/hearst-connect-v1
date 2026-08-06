'use client'

import { categoricalColor, chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — distribution horizontale triée décroissante.
 * La première catégorie porte l’accent ; les suivantes la rampe neutre.
 */

export type DistributionItem = {
  readonly label: string
  readonly value: number
}

export function RichDistributionChart({
  items,
  unit = '',
}: Readonly<{ items: readonly DistributionItem[]; unit?: string }>) {
  const sortedItems = [...items].sort((a, b) => b.value - a.value)
  const height = chartHeight('rows', Math.max(sortedItems.length, 1))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Distribution{unit === '' ? '' : ` (${unit})`}</caption>
          <thead>
            <tr>
              <th scope="col">Catégorie</th>
              <th scope="col">Valeur</th>
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
            <Bar dataKey="value" name="Valeur" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
              {sortedItems.map((item, index) => (
                <Cell key={item.label} fill={categoricalColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Alias de transition — l’ancien nom MUI. */
export const MuiDistributionChart = RichDistributionChart
