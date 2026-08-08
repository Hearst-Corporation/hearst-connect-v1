'use client'

import { surfaceBox } from '@/components/admin/surface'
import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import clsx from 'clsx'
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
 * ── Why at least two months ───────────────────────────────────────────────
 * This file used to argue that the same shape was right at 1, 2 or N months.
 * The visual review disagreed, and it was right: a lone bar inside a plot
 * area reads as a chart whose data failed to load, and the reader hunts for
 * the missing series before concluding that the service has only ever
 * published one month. The Bitcoin page now tests `plottableAsChart` and
 * renders `SingleObservation` below two observations, so this chart is only
 * ever asked to draw a real — if short — series.
 *
 * What still varies with the count is the CAPTION under the chart, which
 * names what is actually readable: two months give a gap but not yet a
 * trend, three or more read bar by bar. And the canvas height, which comes
 * from `chartHeight('columns', …)` in pixels rather than a fixed class, so
 * two bars are not stretched across a canvas built for a year of history.
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

/**
 * Produced bitcoin is an ordinary measurement — it carries no state — so it
 * takes the ordinary-data role, never a semantic color. The same token as
 * `mining-production-chart`: the two pages measure the same thing, and the
 * same thing must not change hue between them.
 */
const SERIE = chartTheme.dataSeries.brandPrimary

type TooltipPayloadRow = { readonly payload?: MoisProduction }

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly TooltipPayloadRow[] }>) {
  const mois = payload?.[0]?.payload
  if (active !== true || mois === undefined) return null

  return (
    <div className={clsx(surfaceBox, 'px-3 py-2 text-xs shadow-lg')}>
      <p className="font-medium text-fg">{mois.libelle}</p>
      <p className="mt-1 text-fg tabular-nums">Produced this month: {mois.btcExact} BTC</p>
      {mois.cumulExact === null ? null : (
        <p className="mt-0.5 text-fg-secondary tabular-nums">
          Cumulative to date: {mois.cumulExact} BTC
        </p>
      )}
    </div>
  )
}

/**
 * What the caption is allowed to claim, based on how many months are recorded.
 * A reader who sees a short series will spontaneously read a trend into it if
 * not told otherwise — this caption exists to correct that.
 */
function readabilityNote(mois: readonly MoisProduction[]): string {
  const premier = mois.at(0)
  const dernier = mois.at(-1)

  if (mois.length === 1) {
    // Unreachable through the Bitcoin page, which switches to
    // `SingleObservation` below two observations. Kept — and made honest —
    // rather than deleted, so a caller that skips that test still gets a true
    // sentence instead of one that talks up a single bar as a chart.
    return `Only one month is recorded (${premier?.libelle ?? '—'}). A single measurement is not a series: this chart expects at least two months, and the value on its own is the accurate way to show it.`
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
  return (
    <div className="px-3 pb-5 sm:px-4">
      {/* The only version readable by screen readers and keyboard navigation.
          It carries the exact satoshi-level figure that the axis rounds.
          Wrapped in a div, not applied to the table itself: a <table>
          ignores width/max-width and sizes to its content regardless, so
          the sr-only 1px clip only holds on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Bitcoin produit par mois enregistré, avec le cumul en fin de mois</caption>
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
      </div>

      {/* Height in pixels, derived from the month count. A short series gets a
          short canvas — that is the whole fix to the "one thin bar floating in
          a plot" defect. */}
      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('columns', Math.max(mois.length, 1)) }}>
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
            {/* `maxBarSize` matters most on a two-month series: without it
                Recharts hands each band its full width and the two bars read
                as slabs filling the frame rather than as two measurements.
                Animation is off, as everywhere in the console: motion delays
                reading and traps screenshots. */}
            <Bar
              dataKey="btc"
              name="Produced that month"
              fill={SERIE}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fg-tertiary dark:text-fg-secondary">
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
