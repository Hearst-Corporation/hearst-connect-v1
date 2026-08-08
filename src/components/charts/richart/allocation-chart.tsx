'use client'

import { chartHeight, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — allocation cible vs constatée, barres horizontales pairées.
 *
 * Une poche sans constaté n’affiche que la cible — jamais 0 % inventé.
 */

export type PosteAllocation = {
  readonly label: string
  readonly ciblePct: number
  readonly constatePct: number | null
}

const CIBLE = chartTheme.dataSeries.brandPrimary
const CONSTATE = chartTheme.dataSeries.dataReference

type Row = { label: string; ciblePct: number; constatePct: number | null }

export function HearstAllocationChart({ postes }: Readonly<{ postes: readonly PosteAllocation[] }>) {
  const height = chartHeight('rows', Math.max(postes.length, 1))
  const anyConstate = postes.some((p) => p.constatePct !== null)
  const data: Row[] = postes.map((p) => ({
    label: p.label,
    ciblePct: p.ciblePct,
    constatePct: p.constatePct,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Allocation cible et constatée par poche, en pourcentage</caption>
          <thead>
            <tr>
              <th scope="col">Poche</th>
              <th scope="col">Target</th>
              <th scope="col">Actual</th>
            </tr>
          </thead>
          <tbody>
            {postes.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.label}</th>
                <td>{formatChartPercent(p.ciblePct)}</td>
                <td>{p.constatePct === null ? 'non lu' : formatChartPercent(p.constatePct)}</td>
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
              strokeDasharray="2 4"
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
            {anyConstate ? (
              <Legend
                wrapperStyle={{ fontSize: chartTheme.axisFontSize, color: chartTheme.tick }}
                iconType="square"
                iconSize={8}
              />
            ) : null}
            <Bar
              dataKey="ciblePct"
              name="Target"
              fill={CIBLE}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
            {anyConstate ? (
              <Bar
                dataKey="constatePct"
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
