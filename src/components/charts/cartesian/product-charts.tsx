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
import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatCurrency, formatNumber } from '@/lib/format'

/**
 * Product-surface charts.
 *
 * Each answers ONE question, posed verbatim in its title by the calling
 * frame. None invents a data point: when the series is missing, the caller
 * renders the frame's waiting state rather than a flat curve that would read
 * as a real zero measurement.
 *
 * ── Sizing ────────────────────────────────────────────────────────────────
 * Neither chart declares a fixed height class any more. Both derive their
 * canvas from what is actually plotted (`chartHeight`, in pixels): two
 * allocation rows get a two-row canvas, not the 180px block that used to
 * leave a band of empty plot under the bars. A chart is never taller than
 * its information value.
 *
 * ── Palette ───────────────────────────────────────────────────────────────
 * Both read `chartTheme.dataSeries` — mint and neutral, the ordinary-data
 * roles. Nothing here carries state, so nothing here may borrow a semantic
 * color: green, orange and red stay available to say that something is
 * genuinely wrong. The gold/blue hardcoded in an earlier version resolved
 * against no declared token at all.
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
    // Same tooltip surface as the production charts: one console, one
    // tooltip. The navy `surface-raised` used here before belonged to the
    // marketing theme and read as a foreign object inside /admin.
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
          {p.name}: {typeof p.value === 'number' ? `${formatNumber(p.value)} ${unit}` : '—'}
        </p>
      ))}
    </div>
  )
}

/* ── Reward curve ────────────────────────────────────────────────────────── */

export type PointCourbe = { readonly mois: number; readonly taux: number }

/**
 * "How does the reward rate evolve over the product's duration?"
 *
 * The zero-length guard is the last line of defence: the calling page already
 * decides, from the series state, whether to render this chart at all. If it
 * ever forgets, an absence is stated rather than drawn as a flat line at zero.
 */
export function VendingCurveChart({ points }: Readonly<{ points: readonly PointCourbe[] }>) {
  if (points.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">
        No reward point can be read from the contract. Nothing is plotted rather than a curve flat at zero.
      </p>
    )
  }

  return (
    <div className="px-3 pb-5 sm:px-4">
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
                {/*
                  Conservé en `toFixed(2)` : ce tableau affiche « 3.50 % »
                  (décimales fixes, espace avant le signe), là où `formatPercent`
                  rendrait « 3.5% ». Router vers le formatter central changerait
                  ce que la table montre — hors périmètre d'une passe de
                  propreté. À arbitrer avec la convergence UI.
                */}
                <td>{p.taux.toFixed(2)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Height in pixels, from the number of points actually measured. */}
      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('line', points.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Negative left margin offsets Recharts' own reserved space for the
              Y axis labels — a real chrome constraint, not layout drift. */}
          <AreaChart data={[...points]} margin={{ ...chartTheme.margin, left: -18 }}>
            <defs>
              <linearGradient id="vendingCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={SERIE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="mois"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(m: number) => `M${m}`}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              unit=" %"
              width={52}
            />
            <Tooltip content={<ChartTooltip unit="%" />} cursor={{ stroke: chartTheme.grid }} />
            {/* No `type="monotone"`: smoothing would invent values between
                two measured months. The line just connects the points, nothing more. */}
            <Area
              type="linear"
              dataKey="taux"
              name="Rate"
              stroke={SERIE}
              strokeWidth={2}
              fill="url(#vendingCurveFill)"
              dot={{ r: 3, fill: SERIE, strokeWidth: 0 }}
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

/**
 * `accent` selects between two ORDINARY colors — the mint that carries the
 * measurement and the neutral it is read against. It is not a state flag, and
 * it never reaches for a semantic color: an allocation split is not an alarm.
 */
function PostBar(props: BarShapeProps) {
  const payload = props.payload as PosteBitcoin | undefined
  return <Rectangle {...props} fill={payload?.accent === true ? SERIE : REFERENCE} />
}

/** "How much sits in reserve, how much is deployed as exposure?" */
export function ReserveExpositionChart({ postes }: Readonly<{ postes: readonly PosteBitcoin[] }>) {
  if (postes.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">
        No allocation entry could be read on-chain. Nothing is plotted rather than a breakdown at zero.
      </p>
    )
  }

  return (
    <div className="px-3 pb-5 sm:px-4">
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

      {/* One row of height per entry, in pixels: two categories get a
          two-row canvas instead of a fixed block with empty plot beneath. */}
      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('rows', postes.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...postes]} layout="vertical" margin={chartTheme.margin}>
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
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="poste"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<ChartTooltip unit="$" />} cursor={{ fill: chartTheme.cursor }} />
            {/* `maxBarSize` keeps two categories from becoming two slabs: the
                bar states an amount, it is not a fill gauge for the frame. */}
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
