'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — activité par période (barres verticales).
 *
 * Reconstruit avec Recharts en dimensions PX mesurées (ResizeObserver) —
 * jamais `ResponsiveContainer` % dans un flex (wrapper 0×0).
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
  const count = points.length
  const height = chartHeight('columns', Math.max(count, 1))
  const { ref, width } = useChartWidth()
  const barCategoryGap = count <= 4 ? '10%' : count <= 8 ? '18%' : '28%'
  const maxBarSize = count <= 4 ? 80 : count <= 8 ? 56 : 40
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

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <BarChart
            width={width}
            height={height}
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
              content={<RichTooltip unit={unite} />}
              cursor={{ fill: chartTheme.cursor }}
              // Recharts lit `label` / `detail` via le payload — on expose la
              // période lisible via le label X (dataKey label).
            />
            <Bar
              dataKey="value"
              name={unite}
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
