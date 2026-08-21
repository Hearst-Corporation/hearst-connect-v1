'use client'

import {
  chartTheme,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow, tooltipPoint } from '@/components/charts/richart/_shared/chart-tooltip'
import { ChartViewportEmpty, sortByLabelTime, useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — courbe continue (aire + ligne).
 *
 * Pour les mesures qui existent à chaque instant : AUM, drift, rendement…
 * Jamais de barres : une barre inventerait un compte discret entre deux points.
 *
 * Construit avec Recharts en dimensions PX mesurées (ResizeObserver) —
 * jamais `ResponsiveContainer` % dans un flex (wrapper 0×0).
 *
 * ── dataviz craft ─────────────────────────────────────────────────────────
 * Wash gradient (série ~14 % → 0), grille pleine en hairline (jamais tiretée),
 * AUCUN point sur chaque observation (crosshair + point actif au survol,
 * cerclé de la surface), et l'axe X saute des graduations plutôt que de les
 * chevaucher (`minTickGap`). La valeur courante se lit dans le KPI hero ou le
 * tooltip — pas en étiquetant chaque point.
 */

export type LinePoint = {
  /** Stable React key when `label` is not unique (e.g. multiple samples on one calendar day). */
  readonly id?: string
  readonly label: string
  readonly value: number
  readonly detail?: string
}

const SERIE = chartTheme.dataSeries.brandPrimary
/** Surface color for the active-dot ring — keeps the marker legible on the line. */
const SURFACE_RING = 'var(--color-console-surface)'

function LineTooltip({
  active,
  payload,
  unit,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: LinePoint }[]
  unit: string
}>) {
  const point = tooltipPoint(active, payload)
  if (point === null) return null

  return (
    <ChartTooltipShell title={point.detail ?? point.label}>
      <TooltipRow first label={unit} value={formatNumber(point.value, { maximumFractionDigits: 2 })} />
    </ChartTooltipShell>
  )
}

export function HearstLineChart({
  points,
  unit,
  color = SERIE,
  height,
  viewport,
  yTickFormatter,
}: Readonly<{
  points: readonly LinePoint[]
  unit: string
  color?: string
  height?: number
  viewport?: ChartViewportRole
  yTickFormatter?: (v: number) => string
}>) {
  // Hooks must run unconditionally — call before any early return (rules-of-hooks).
  const { ref, width, viewportHeight } = useChartViewport({ height, viewport, kind: 'line' })
  const gradientId = useId()

  if (points.length === 0) {
    return <ChartViewportEmpty viewportHeight={viewportHeight} message="No data points for this period." />
  }

  const sorted = sortByLabelTime(points)
  const data = sorted.map((p) => ({ ...p }))

  return (
    <div className="min-w-0">
      <ChartAccessibilityTable
        caption={`${unit} over time`}
        columns={['Date', unit]}
        rows={sorted.map((p) => ({
          key: p.id ?? p.label,
          label: p.detail ?? p.label,
          cells: [formatNumber(p.value, { maximumFractionDigits: 2 })],
        }))}
      />

      <div
        ref={ref}
        aria-hidden="true"
        className="w-full min-w-0"
        style={{ height: viewportHeight }}
        data-chart-viewport={viewportHeight}
      >
        {width > 0 ? (
          <AreaChart
            width={width}
            height={viewportHeight}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="70%" stopColor={color} stopOpacity={0.04} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              interval="preserveStartEnd"
              minTickGap={44}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickCount={5}
              tickFormatter={yTickFormatter ?? ((v: number) => formatNumber(v, { maximumFractionDigits: 0 }))}
            />
            <Tooltip content={<LineTooltip unit={unit} />} cursor={{ stroke: chartTheme.cursor, strokeWidth: 1.5 }} />
            <Area
              type="monotone"
              dataKey="value"
              name={unit}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: SURFACE_RING, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : null}
      </div>
    </div>
  )
}
