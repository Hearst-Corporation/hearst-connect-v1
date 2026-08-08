'use client'

import { surfaceBox } from '@/components/admin/surface'
import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import clsx from 'clsx'
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
 * richart — allocation drift history curve.
 *
 * Shows drift (driftBps) over time. An optional threshold line is drawn only
 * when the backend supplies `thresholdBps` — never hardcoded on the frontend.
 */

export type PointDrift = {
  readonly date: string
  readonly driftBps: number
  readonly rebalanced: boolean
}

const SERIE = chartTheme.dataSeries.brandPrimary

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
  const status = point.rebalanced ? 'Rebalance executed' : 'Observation'

  return (
    <div className={clsx(surfaceBox, 'px-3 py-2 text-xs shadow-lg')}>
      <p className="font-medium text-ink dark:text-fg">{formatDate(point.date)}</p>
      <p className="mt-1 tabular-nums text-fg-secondary">Drift: {driftPct}%</p>
      <p className="mt-0.5 text-fg-tertiary">{status}</p>
    </div>
  )
}

export function RebalancingHistoryChart({
  points,
  thresholdBps,
}: Readonly<{ points: readonly PointDrift[]; thresholdBps?: number | null }>) {
  if (points.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary">
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
  const threshold =
    typeof thresholdBps === 'number' && Number.isFinite(thresholdBps) ? thresholdBps : null
  const yMax = threshold === null ? maxDrift + 200 : Math.max(maxDrift + 200, threshold + 200)

  return (
    <div className="px-3 pb-5 sm:px-4">
      <div className="sr-only">
        <table>
          <caption>Allocation drift history — deviation from target over time</caption>
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
            {threshold !== null ? (
              <Line
                type="monotone"
                dataKey={() => threshold / 100}
                stroke={chartTheme.semantic.warning}
                strokeDasharray="4 4"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
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

      <p className="mt-3 text-xs leading-relaxed text-fg-tertiary">
        {points.length} observation point{points.length > 1 ? 's' : ''}.
        {threshold !== null
          ? ' The dashed amber line marks the rebalancing threshold reported by the backend.'
          : ' No rebalancing threshold was reported — drift is shown without a reference line.'}{' '}
        Green dots indicate a completed rebalance.
      </p>
    </div>
  )
}
