'use client'

import { chartHeight, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * richart — courbe de taux en escalier (`stepAfter`).
 *
 * Un spline lissé inventerait un taux entre deux jalons ; le produit n’en a pas.
 */

export type PointCourbe = {
  readonly mois: number
  readonly taux: number
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstCourbeChart({
  points,
  domaineLabel = 'Mois',
}: Readonly<{ points: readonly PointCourbe[]; domaineLabel?: string }>) {
  const ordonnes = [...points].sort((a, b) => a.mois - b.mois)
  const height = chartHeight('line', Math.max(ordonnes.length, 1))
  const data = ordonnes.map((p) => ({
    mois: p.mois,
    taux: p.taux,
    label: `${domaineLabel} ${p.mois}`,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Taux de rémunération par mois-jalon du produit</caption>
          <thead>
            <tr>
              <th scope="col">{domaineLabel}</th>
              <th scope="col">Taux</th>
            </tr>
          </thead>
          <tbody>
            {ordonnes.map((p) => (
              <tr key={p.mois}>
                <th scope="row">
                  {domaineLabel} {p.mois}
                </th>
                <td>{formatChartPercent(p.taux)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ ...chartTheme.margin, right: 16, left: -8 }}>
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
              tickFormatter={(v: number) => formatChartPercent(v)}
            />
            <Tooltip content={<RichTooltip unit="%" />} cursor={{ stroke: chartTheme.cursor }} />
            <Line
              type="stepAfter"
              dataKey="taux"
              name="Taux"
              stroke={SERIE}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIE, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
