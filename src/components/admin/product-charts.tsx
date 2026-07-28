'use client'

import {
  Area,
  AreaChart,
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
import { chartTheme } from '@/lib/chart-theme'
import { formatCurrency, formatNumber } from '@/lib/format'

/**
 * Product-surface charts.
 *
 * Each answers ONE question, posed verbatim in its title by the calling
 * frame. None invents a data point: when the series is missing, the caller
 * renders the frame's waiting state rather than a flat curve that would read
 * as a real zero measurement.
 *
 * Animations are disabled everywhere: in an operations console, motion
 * delays reading without teaching anything, and it trips up screenshots.
 */

// Product palette, read from tokens: a single accent (Hearst mint),
// everything else on the neutral scale. The hardcoded gold/blue values
// came from an earlier theme and didn't resolve against any declared token.
const ACCENT = 'var(--color-accent-500)'
const NEUTRAL = 'var(--color-zinc-500)'
const GRID = 'var(--color-zinc-700)'
const AXIS = 'var(--color-zinc-400)'

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
    <div className="rounded-lg border border-white/10 bg-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-300 tabular-nums">
          {p.name}: {typeof p.value === 'number' ? `${formatNumber(p.value)} ${unit}` : '—'}
        </p>
      ))}
    </div>
  )
}

/* ── Reward curve ────────────────────────────────────────────────────────── */

export type PointCourbe = { readonly mois: number; readonly taux: number }

/** "How does the reward rate evolve over the product's duration?" */
export function VendingCurveChart({ points }: Readonly<{ points: readonly PointCourbe[] }>) {
  return (
    <div className="px-2 py-4">
      {/* Wrapped in a div, not applied to the table itself: a <table> ignores
          width/max-width and sizes to its content regardless, so the sr-only
          1px clip only holds on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Reward rate by month, as a percentage</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Rate</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.mois}>
                <th scope="row">Month {p.mois}</th>
                <td>{p.taux.toFixed(2)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className={`${chartTheme.height.medium} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Negative left margin offsets Recharts' own reserved space for the
              Y axis labels — a real chrome constraint, not layout drift. */}
          <AreaChart data={[...points]} margin={{ ...chartTheme.margin, left: -18 }}>
            <defs>
              <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fill: AXIS, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(m: number) => `M${m}`}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              unit=" %"
              width={52}
            />
            <Tooltip content={<ChartTooltip unit="%" />} cursor={{ stroke: GRID }} />
            {/* No `type="monotone"`: smoothing would invent values between
                two measured months. The line just connects the points, nothing more. */}
            <Area
              type="linear"
              dataKey="taux"
              name="Rate"
              stroke={ACCENT}
              strokeWidth={2}
              fill="url(#accentGradient)"
              dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Reserve and exposure ────────────────────────────────────────────────── */

export type PosteBitcoin = { readonly poste: string; readonly montant: number; readonly accent: boolean }

function PostBar(props: BarShapeProps) {
  const payload = props.payload as PosteBitcoin | undefined
  return <Rectangle {...props} fill={payload?.accent ? ACCENT : NEUTRAL} />
}

/** "How much sits in reserve, how much is deployed as exposure?" */
export function ReserveExpositionChart({ postes }: Readonly<{ postes: readonly PosteBitcoin[] }>) {
  return (
    <div className="px-2 py-4">
      {/* Wrapped in a div, not applied to the table itself: a <table> ignores
          width/max-width and sizes to its content regardless, so the sr-only
          1px clip only holds on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Reserve versus exposure breakdown, in dollars</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {postes.map((p) => (
              <tr key={p.poste}>
                <th scope="row">{p.poste}</th>
                <td>{formatCurrency(p.montant, { fromAtomic: 1, decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className={`${chartTheme.height.small} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...postes]} layout="vertical" margin={chartTheme.margin}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: AXIS, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="poste"
              tick={{ fill: AXIS, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<ChartTooltip unit="$" />} cursor={{ fill: '#ffffff0a' }} />
            <Bar
              dataKey="montant"
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
