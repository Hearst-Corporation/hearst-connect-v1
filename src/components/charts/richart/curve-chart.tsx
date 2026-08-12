'use client'

import { resolveChartViewport, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
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
 * richart — stepped rate curve (`stepAfter`).
 *
 * A smoothed spline would invent a rate between two milestones; the product has none.
 */

export type CurvePoint = {
  readonly month: number
  readonly rate: number
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstCurveChart({
  points,
  domainLabel = 'Mois',
}: Readonly<{ points: readonly CurvePoint[]; domainLabel?: string }>) {
  const sorted = [...points].sort((a, b) => a.month - b.month)
  const height = resolveChartViewport({ kind: 'line' })
  const data = sorted.map((p) => ({
    month: p.month,
    rate: p.rate,
    label: `${domainLabel} ${p.month}`,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Yield rate per product milestone month</caption>
          <thead>
            <tr>
              <th scope="col">{domainLabel}</th>
              <th scope="col">Taux</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.month}>
                <th scope="row">
                  {domainLabel} {p.month}
                </th>
                <td>{formatChartPercent(p.rate)}</td>
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
              dataKey="rate"
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
