'use client'

import { chartHeight, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — target vs actual allocation, paired horizontal bars.
 *
 * A pocket without an actual reading only shows the target — never a made-up 0%.
 */

export type AllocationItem = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}

const CIBLE = chartTheme.dataSeries.brandPrimary
const CONSTATE = chartTheme.dataSeries.dataReference

type Row = { label: string; targetPct: number; actualPct: number | null }

export function HearstAllocationChart({ items }: Readonly<{ items: readonly AllocationItem[] }>) {
  const height = chartHeight('rows', Math.max(items.length, 1))
  const anyActual = items.some((p) => p.actualPct !== null)
  const data: Row[] = items.map((p) => ({
    label: p.label,
    targetPct: p.targetPct,
    actualPct: p.actualPct,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Target and actual allocation per pocket, in percent</caption>
          <thead>
            <tr>
              <th scope="col">Poche</th>
              <th scope="col">Target</th>
              <th scope="col">Actual</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.label}</th>
                <td>{formatChartPercent(p.targetPct)}</td>
                <td>{p.actualPct === null ? 'non lu' : formatChartPercent(p.actualPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ ...chartTheme.margin, left: 8, right: 16 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatChartPercent(v)}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip
              content={
                <RichTooltip
                  unit="%"
                />
              }
              cursor={{ fill: chartTheme.cursor }}
            />
            {anyActual ? (
              <Legend
                wrapperStyle={{ fontSize: chartTheme.axisFontSize, color: chartTheme.tick }}
                iconType="square"
                iconSize={8}
              />
            ) : null}
            <Bar
              dataKey="targetPct"
              name="Target"
              fill={CIBLE}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
            {anyActual ? (
              <Bar
                dataKey="actualPct"
                name="Actual"
                fill={CONSTATE}
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
