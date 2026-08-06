'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — activité par période (barres verticales).
 *
 * Barres, jamais une ligne : chaque point est un compte / montant fermé pour
 * un bucket. Une ligne inventerait une pente entre deux buckets non mesurés.
 */

export type PointActivite = {
  readonly label: string
  readonly value: number
  readonly detail: string
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstActivityChart({
  points,
  unite,
  color = SERIE,
}: Readonly<{ points: readonly PointActivite[]; unite: string; color?: string }>) {
  const height = chartHeight('columns', Math.max(points.length, 1))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Activité par période, en {unite}</caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Valeur ({unite})</th>
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

      <div aria-hidden="true" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...points]} margin={{ ...chartTheme.margin, right: 12, left: -8 }}>
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
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => formatNumber(v, { maximumFractionDigits: 0 })}
            />
            <Tooltip content={<RichTooltip unit={unite} />} cursor={{ fill: chartTheme.cursor }} />
            <Bar
              dataKey="value"
              name={unite}
              fill={color}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
