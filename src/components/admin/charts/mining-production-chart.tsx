'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * "How much is the fleet producing, month over month?"
 *
 * The single real time series in the mining domain: contract-attested
 * bitcoin, aggregated by operating month. The service currently publishes
 * only one data point — the single bar is not a rendering defect, it is the
 * exact extent of the available history, and the caller spells that out
 * below the chart.
 *
 * No projection, no smoothing: one bar = one month actually recorded.
 * Period labels arrive already formatted, so this client component doesn't
 * have to redo the server's work.
 */

export type MoisProduit = {
  /** Human-readable period, already formatted by the page ("July 2026"). */
  readonly libelle: string
  readonly btc: number
}

const MINT = chartTheme.series.primary

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
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
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
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        The service responds, and its production history does not contain any month yet. Nothing is plotted rather
        than a bar at zero.
      </p>
    )
  }

  return (
    <div className="px-2 py-4">
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

      <div aria-hidden="true" className={`${chartTheme.height.medium} w-full`}>
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
            {/* Animation disabled, as everywhere in the console: a bar growing
                from zero delays reading and trips up screenshots. */}
            <Bar dataKey="btc" name="Bitcoin produced" fill={MINT} radius={[3, 3, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
