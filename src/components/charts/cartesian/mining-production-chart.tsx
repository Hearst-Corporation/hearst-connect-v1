'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * "How much is the fleet producing, month over month?"
 *
 * The single real time series in the mining domain: contract-attested
 * bitcoin, aggregated by operating month. No projection, no smoothing, no
 * interpolation — one bar is one month actually recorded.
 *
 * ── What this component now assumes ───────────────────────────────────────
 * It draws a TREND, and a trend needs at least two ordered observations. The
 * Mining page tests `plottableAsChart` before it gets here and renders
 * `SingleObservation` when the service has published a single month — which
 * is still the case on this deployment. The earlier claim that "a single bar
 * is not a rendering defect" is what the visual review rejected: alone in a
 * fixed 220px plot, one bar reads as a chart with missing data.
 *
 * So the canvas is sized from the real number of months
 * (`chartHeight('columns', …)`, in pixels) instead of a fixed height class: a
 * two-bar series no longer floats in a canvas built for a year of history.
 *
 * The zero-length guard below stays as the last line of defence, for a caller
 * that skips the `plottableAsChart` test.
 *
 * Period labels arrive already formatted, so this client component doesn't
 * have to redo the server's work.
 */

export type MoisProduit = {
  /** Human-readable period, already formatted by the page ("July 2026"). */
  readonly libelle: string
  readonly btc: number
}

/**
 * The measurement's color, read from the ordinary-data role — never from the
 * semantic group, since produced bitcoin carries no state. This is the SAME
 * token as `btc-production-chart`: the two views measure the same thing, and
 * the same thing must not change hue from one page to the next.
 */
const SERIE = chartTheme.dataSeries.brandPrimary

function formatBtc(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 8 })
}

function ChartTooltip({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { value?: number }[]; label?: string }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const value = payload[0]?.value
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
        {typeof value === 'number' ? `${formatBtc(value)} BTC` : '—'}
      </p>
    </div>
  )
}

export function MiningProductionChart({ mois }: Readonly<{ mois: readonly MoisProduit[] }>) {
  if (mois.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">
        The service responds, and its production history does not contain any month yet. Nothing is plotted rather
        than a bar at zero.
      </p>
    )
  }

  return (
    <div className="px-3 pb-5 sm:px-4">
      {/* The table is not a duplicate: it's the only version readable by
          screen readers and keyboard users. Hidden visually, never from
          assistive tech. Wrapped in a div, not applied to the table itself:
          a <table> ignores width/max-width and sizes to its content
          regardless, so the sr-only 1px clip only holds on a non-table
          wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Bitcoin produced per operating month, as attested by the contract</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Bitcoin produced</th>
            </tr>
          </thead>
          <tbody>
            {mois.map((m) => (
              <tr key={m.libelle}>
                <th scope="row">{m.libelle}</th>
                <td>{formatBtc(m.btc)} BTC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Height in pixels, derived from the month count: the canvas is never
          taller than the series justifies. */}
      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('columns', mois.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* left stays negative: it pulls the axis back against the width=64
              YAxis reserving its own space, which otherwise doubles up as blank margin. */}
          <BarChart data={[...mois]} margin={{ ...chartTheme.margin, top: 4, right: 8, bottom: 4, left: -8 }}>
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
              tickFormatter={(v: number) => formatNumber(v, { maximumFractionDigits: 2 })}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* `maxBarSize` is what keeps a short series honest: without it
                Recharts hands each band its full width, and two months read as
                two slabs filling the frame rather than as two measurements.
                Same value as `btc-production-chart`, for the same reason.
                Animation is disabled, as everywhere in the console: a bar
                growing from zero delays reading and trips up screenshots. */}
            <Bar
              dataKey="btc"
              name="Bitcoin produced"
              fill={SERIE}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
