'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — signed horizontal bars from a zero baseline.
 *
 * For named categories carrying a value whose SIGN matters (backtest returns,
 * P&L per scenario). Sign is encoded honestly by direction: gains extend right
 * in mint, losses extend left in neutral grey — the zero line is the anchor, so
 * a −47 % never looks like a +47 %. The data-end is rounded, the baseline end
 * square (dataviz mark spec). Bars are sorted best-first; the value rides each
 * tip, and category names sit on the left where long labels never collide.
 */

export type SignedBarItem = {
  readonly label: string
  readonly value: number
  readonly detail?: string
}

const POSITIVE = chartTheme.dataSeries.brandPrimary
const NEGATIVE = chartTheme.dataSeries.dataReference

/** Rounds only the data-end (away from zero); the baseline end stays square. */
function roundedEndPath(x: number, y: number, w: number, h: number, positive: boolean): string {
  const r = Math.max(0, Math.min(4, Math.abs(w), h / 2))
  if (w <= 0 || h <= 0) return ''
  return positive
    ? `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
    : `M${x + r},${y} H${x + w} V${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`
}

type ShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  payload?: SignedBarItem
}

function SignedBarShape(props: ShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props
  const positive = typeof payload?.value === 'number' ? payload.value >= 0 : true
  // For negative bars Recharts gives a negative width extending left from zero.
  const left = width < 0 ? x + width : x
  const w = Math.abs(width)
  const d = roundedEndPath(left, y, w, height, positive)
  return <path d={d} fill={fill} />
}

type LabelProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
}

/** Value label at the data-end tip: right of positive bars, left of negative. */
function TipLabel(props: LabelProps) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  const positive = value >= 0
  const tipX = positive ? x + width + 6 : x + width - 6
  const text = `${positive ? '+' : ''}${formatNumber(value, { maximumFractionDigits: 1 })}%`
  return (
    <text
      x={tipX}
      y={y + height / 2}
      dominantBaseline="central"
      textAnchor={positive ? 'start' : 'end'}
      className="fill-fg-secondary tabular-nums"
      fontSize={11}
    >
      {text}
    </text>
  )
}

function SignedTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: SignedBarItem }[] }>) {
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{point.detail ?? point.label}</p>
      <p className="mt-1 tabular-nums text-fg-tertiary dark:text-fg-secondary">
        {point.value >= 0 ? '+' : ''}
        {formatNumber(point.value, { maximumFractionDigits: 2 })}%
      </p>
    </div>
  )
}

export function SignedBarChart({
  items,
  height,
}: Readonly<{ items: readonly SignedBarItem[]; height?: number }>) {
  const { ref, width } = useChartWidth()

  if (items.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No runs for this period.
      </p>
    )
  }

  const sorted = [...items].sort((a, b) => b.value - a.value)
  const viewportHeight = height ?? chartHeight('rows', Math.max(sorted.length, 1))
  // Symmetric-ish domain so the zero line sits where the data places it.
  const maxAbs = Math.max(...sorted.map((d) => Math.abs(d.value)), 1)

  return (
    <div className="min-w-0">
      <div className="sr-only">
        <table>
          <caption>Total return by scenario (%)</caption>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Total return (%)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.detail ?? item.label}</th>
                <td>{formatNumber(item.value, { maximumFractionDigits: 2 })}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: viewportHeight }}>
        {width > 0 ? (
          <BarChart
            width={width}
            height={viewportHeight}
            data={sorted}
            layout="vertical"
            margin={{ top: 6, right: 60, bottom: 6, left: 8 }}
            barCategoryGap="28%"
          >
            <XAxis type="number" domain={[-maxAbs, maxAbs]} hide />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={104}
            />
            <ReferenceLine x={0} stroke={chartTheme.grid} strokeOpacity={0.25} />
            <Tooltip content={<SignedTooltip />} cursor={{ fill: chartTheme.cursor }} />
            <Bar dataKey="value" name="Total return" maxBarSize={22} shape={<SignedBarShape />} isAnimationActive={false}>
              {sorted.map((item) => (
                <Cell key={item.label} fill={item.value >= 0 ? POSITIVE : NEGATIVE} />
              ))}
              <LabelList dataKey="value" content={<TipLabel />} />
            </Bar>
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
