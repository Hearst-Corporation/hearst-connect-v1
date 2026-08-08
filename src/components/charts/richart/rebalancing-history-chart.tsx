'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
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
 * richart — courbe historique de drift de rééquilibrage.
 *
 * Montre l'écart d'allocation (driftBps) au fil du temps.
 * Une ligne horizontale à 0 représente l'objectif (pas d'écart).
 * Les points au-dessus de 1000 bps (10%) sont en warning — seuil de rééquilibrage.
 */

export type PointDrift = {
  readonly date: string
  readonly driftBps: number
  readonly rebalanced: boolean
}

const SERIE = chartTheme.dataSeries.brandPrimary
const SEUIL_WARNING = 1000 // 10%

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: PointDrift }[]
}>) {
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null

  const driftPct = formatNumber(point.driftBps / 100, { maximumFractionDigits: 2 })
  const status = point.rebalanced ? 'Rebalanced' : 'Observation'

  return (
    <div className="rounded-lg bg-console-card px-3 py-2 text-xs shadow-lg ring-1 ring-console-line">
      <p className="font-medium text-fg">{formatDate(point.date)}</p>
      <p className="mt-1 tabular-nums text-fg-secondary">Drift: {driftPct}%</p>
      <p className="mt-0.5 text-fg-tertiary">{status}</p>
    </div>
  )
}

export function RebalancingHistoryChart({
  points,
}: Readonly<{ points: readonly PointDrift[] }>) {
  if (points.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No drift history points were read.
      </p>
    )
  }

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const data = sorted.map((p) => ({
    ...p,
    label: formatDate(p.date),
    driftPct: p.driftBps / 100,
  }))

  const maxDrift = Math.max(...data.map((d) => d.driftBps))
  const yMax = Math.max(maxDrift + 200, SEUIL_WARNING + 200)

  return (
    <div className="px-3 pb-5 sm:px-4">
      <div className="sr-only">
        <table>
          <caption>Allocation drift history over time</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Drift</th>
              <th scope="col">Rebalanced</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.date}>
                <th scope="row">{formatDate(p.date)}</th>
                <td>{formatNumber(p.driftBps / 100, { maximumFractionDigits: 2 })}%</td>
                <td>{p.rebalanced ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('line', data.length) }}>
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
              unit="%"
              domain={[0, yMax / 100]}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartTheme.cursor }} />
            {/* Ligne de seuil à 10% */}
            <Line
              type="monotone"
              dataKey={() => SEUIL_WARNING / 100}
              stroke={chartTheme.semantic.warning}
              strokeDasharray="4 4"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="driftPct"
              name="Drift"
              stroke={SERIE}
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: PointDrift }) => {
                const rebalanced = props.payload?.rebalanced ?? false
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={rebalanced ? 5 : 3}
                    fill={rebalanced ? chartTheme.semantic.positive : SERIE}
                    strokeWidth={0}
                  />
                )
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fg-tertiary dark:text-fg-secondary">
        {points.length} observation point{points.length > 1 ? 's' : ''}. The amber dashed line marks the 10%
        rebalancing threshold. Green dots indicate a completed rebalance.
      </p>
    </div>
  )
}
