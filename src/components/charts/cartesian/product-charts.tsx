'use client'

import { surfaceBox } from '@/components/admin/surface'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts'
import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatCurrency, formatNumber } from '@/lib/format'
import clsx from 'clsx'

/**
 * Product-surface charts.
 *
 * Each answers ONE question, posed verbatim in its title by the calling
 * frame. None invents a data point: when the series is missing, the caller
 * renders the frame's waiting state rather than a flat curve that would read
 * as a real zero measurement.
 *
 * ── Sizing ────────────────────────────────────────────────────────────────
 * The canvas derives from what is actually plotted (`chartHeight`, in pixels):
 * two allocation rows get a two-row canvas, not a fixed block that would leave
 * empty plot beneath the bars.
 *
 * ── Palette ───────────────────────────────────────────────────────────────
 * Reads `chartTheme.dataSeries` — mint and neutral, the ordinary-data roles.
 * Nothing here carries state, so nothing here may borrow a semantic color.
 *
 * Animations are disabled everywhere: in an operations console, motion
 * delays reading without teaching anything, and it trips up screenshots.
 */

/** The measured quantity. */
const SERIE = chartTheme.dataSeries.brandPrimary
/** What it is read against — the other half of the allocation. */
const REFERENCE = chartTheme.dataSeries.dataReference

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: Readonly<{
  active?: boolean
  payload?: readonly { name?: string; value?: number }[]
  label?: string | number
  unit: string
}>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  return (
    <div className={clsx(surfaceBox, 'px-3 py-2 text-xs shadow-lg')}>
      <p className="font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-fg tabular-nums">
          {p.name}: {typeof p.value === 'number' ? `${formatNumber(p.value)} ${unit}` : '—'}
        </p>
      ))}
    </div>
  )
}

/* ── Reserve and exposure ────────────────────────────────────────────────── */

export type BitcoinItem = { readonly item: string; readonly amount: number; readonly accent: boolean }

/**
 * `accent` selects between two ORDINARY colors — the mint that carries the
 * measurement and the neutral it is read against. It is not a state flag, and
 * it never reaches for a semantic color: an allocation split is not an alarm.
 */
function PostBar(props: BarShapeProps) {
  const payload = props.payload as BitcoinItem | undefined
  return <Rectangle {...props} fill={payload?.accent === true ? SERIE : REFERENCE} />
}

/** "How much sits in reserve, how much is deployed as exposure?" */
export function ReserveExposureChart({ items }: Readonly<{ items: readonly BitcoinItem[] }>) {
  if (items.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No allocation readable on-chain. Nothing is plotted, rather than a split at zero.
      </p>
    )
  }

  return (
    <div className="px-3 pb-5 sm:px-4">
      <div className="sr-only">
        <table>
          <caption>Reserve and exposure, in dollars</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.item}>
                <th scope="row">{p.item}</th>
                <td>{formatCurrency(p.amount, { fromAtomic: 1, decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('rows', items.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...items]} layout="vertical" margin={chartTheme.margin}>
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
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="item"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<ChartTooltip unit="$" />} cursor={{ fill: chartTheme.cursor }} />
            <Bar
              dataKey="amount"
              name="Amount"
              shape={PostBar}
              radius={[0, 3, 3, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
