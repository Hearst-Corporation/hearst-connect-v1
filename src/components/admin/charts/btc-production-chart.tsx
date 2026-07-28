'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * "At what pace is bitcoin being produced?"
 *
 * ── Why bars, and never a line ────────────────────────────────────────────
 * The service reports production BY MONTH: each month is a closed, measured
 * quantity, independent from the next. A line would connect these readings
 * with a segment, and that segment would read as an observed progression
 * between the two dates — a claim nobody actually measured. Bars only assert
 * what was recorded.
 *
 * ── Why the same shape at 1, 2, or N months ───────────────────────────────
 * The temptation would be to switch rendering based on the point count. It's
 * the opposite that's needed: the bar is accurate from the first month on —
 * a single bar is one measured month, not an amputated trend — and it stays
 * accurate as the series grows. What changes is the CAPTION under the chart,
 * which names what is actually readable: one month permits no trend, two
 * months give a gap but not yet a trend, three or more read bar by bar.
 *
 * ── On the unit ────────────────────────────────────────────────────────────
 * The axis is in BTC, readable at a glance. The exact satoshi-level figure
 * stays accessible in the tooltip and in the table read by assistive tech:
 * the axis rounding never replaces the measurement.
 */

export type MoisProduction = {
  /** Stable month key, as returned by the service ("2026-07"). */
  readonly periode: string
  /** The same month, in display form ("Jul 2026"). */
  readonly libelle: string
  /** Month's production, in BTC — used only for the chart scale. */
  readonly btc: number
  /** Month's production to the satoshi, already formatted losslessly. */
  readonly btcExact: string
  /** Cumulative total at the end of this month, to the satoshi. `null` if not provided. */
  readonly cumulExact: string | null
}

type TooltipPayloadRow = { readonly payload?: MoisProduction }

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly TooltipPayloadRow[] }>) {
  const mois = payload?.[0]?.payload
  if (active !== true || mois === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{mois.libelle}</p>
      <p className="mt-1 text-zinc-600 tabular-nums dark:text-zinc-300">Produced this month: {mois.btcExact} BTC</p>
      {mois.cumulExact === null ? null : (
        <p className="mt-0.5 text-zinc-500 tabular-nums dark:text-zinc-400">
          Cumulative to date: {mois.cumulExact} BTC
        </p>
      )}
    </div>
  )
}

/**
 * What the caption is allowed to claim, based on how many months are recorded.
 * A reader who sees a single bar will spontaneously read a trend into it if
 * not told otherwise — this caption exists to correct that.
 */
function readabilityNote(mois: readonly MoisProduction[]): string {
  const premier = mois[0]
  const dernier = mois[mois.length - 1]

  if (mois.length === 1) {
    return `Only one month has been recorded so far (${premier?.libelle ?? '—'}). The bar shows what was produced that month: no trend is measurable yet.`
  }
  if (mois.length === 2) {
    return `Two months have been recorded. The gap between the two bars can be read, but two data points don't yet make a trend.`
  }
  return `${mois.length} months recorded, from ${premier?.libelle ?? '—'} to ${dernier?.libelle ?? '—'}. The trend reads bar by bar, each bar remaining a measurement of its own month.`
}

/** An axis in BTC: three decimals are enough to situate, not to assert. */
function formatTick(valeur: number): string {
  return formatNumber(valeur, { maximumFractionDigits: 3 })
}

export function ProductionMensuelleChart({
  mois,
  cumulBtc,
}: Readonly<{ mois: readonly MoisProduction[]; cumulBtc: string | null }>) {
  if (mois.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No production month can be read from the data. Nothing is plotted rather than showing a bar at zero.
      </p>
    )
  }

  return (
    <div className="px-2 py-4">
      {/* The only version readable by screen readers and keyboard navigation.
          It carries the exact satoshi-level figure that the axis rounds. */}
      <table className="sr-only">
        <caption>Bitcoin produced per recorded month, with cumulative total at month end</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Produced that month</th>
            <th scope="col">Cumulative at month end</th>
          </tr>
        </thead>
        <tbody>
          {mois.map((m) => (
            <tr key={m.periode}>
              <th scope="row">{m.libelle}</th>
              <td>{m.btcExact} BTC</td>
              <td>{m.cumulExact === null ? 'not reported' : `${m.cumulExact} BTC`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className={`${chartTheme.height.medium} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          {/* `left` stays negative: the YAxis reserves 64px of its own width
              for the tick labels, and without this offset the plot area
              would be pushed further right than the frame around it. */}
          <BarChart data={[...mois]} margin={{ ...chartTheme.margin, right: 12, left: -8 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="libelle"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              unit=" BTC"
              tickFormatter={formatTick}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* `maxBarSize` matters most in the first month: without it, a
                single bar would occupy the full width and read as a total,
                not as one point in a series. Animation is off, as everywhere
                in the console: motion delays reading and traps screenshots. */}
            <Bar
              dataKey="btc"
              name="Produced that month"
              fill={chartTheme.series.primaryFill}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 px-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {readabilityNote(mois)}
        {cumulBtc === null ? null : (
          <>
            {' '}
            Cumulative total reported by the service since inception: <span className="tabular-nums">{cumulBtc} BTC</span>.
          </>
        )}
      </p>
    </div>
  )
}
