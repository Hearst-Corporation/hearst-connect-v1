'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { formatNumber } from '@/lib/format'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — courbe continue (aire + ligne).
 *
 * Pour les mesures qui existent à chaque instant : AUM, drift, rendement…
 * Jamais de barres : une barre inventerait un compte discret entre deux points.
 *
 * Construit avec Recharts en dimensions PX mesurées (ResizeObserver) —
 * jamais `ResponsiveContainer` % dans un flex (wrapper 0×0).
 */

export type LinePoint = {
  readonly label: string
  readonly value: number
  readonly detail?: string
}

const SERIE = chartTheme.dataSeries.brandPrimary

function LineTooltip({
  active,
  payload,
  unit,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: LinePoint }[]
  unit: string
}>) {
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{point.detail ?? point.label}</p>
      <p className="mt-1 text-fg-tertiary tabular-nums">
        {unit}: {formatNumber(point.value, { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export function HearstLineChart({
  points,
  unit,
  color = SERIE,
  height,
  yTickFormatter,
}: Readonly<{
  points: readonly LinePoint[]
  unit: string
  color?: string
  height?: number
  yTickFormatter?: (v: number) => string
}>) {
  if (points.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No data points for this period.
      </p>
    )
  }

  const sorted = [...points].sort((a, b) => +new Date(a.label) - +new Date(b.label))
  const data = sorted.map((p) => ({ ...p }))
  const viewportHeight = height ?? chartHeight('line', Math.max(data.length, 1))
  const { ref, width } = useChartWidth()

  return (
    <div className="min-w-0">
      <div className="sr-only">
        <table>
          <caption>
            {unit} over time
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.detail ?? p.label}</th>
                <td>{formatNumber(p.value, { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: viewportHeight }}>
        {width > 0 ? (
          <AreaChart
            width={width}
            height={viewportHeight}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
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
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={yTickFormatter ?? ((v: number) => formatNumber(v, { maximumFractionDigits: 0 }))}
            />
            <Tooltip content={<LineTooltip unit={unit} />} cursor={{ stroke: chartTheme.cursor }} />
            <Area
              type="monotone"
              dataKey="value"
              name={unit}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : null}
      </div>
    </div>
  )
}
