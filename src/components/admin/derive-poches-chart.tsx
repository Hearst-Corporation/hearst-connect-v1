'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * "Which pocket has drifted from its target, and in which direction?"
 *
 * The classic allocation chart (target vs. actual) answers "where is the
 * money." On an operations page, the question is different: it's about the
 * ACTION to take — which pocket has drifted, by how much, and in which
 * direction. So it's the signed drift that's plotted, around a zero line,
 * rather than two bars to compare by eye.
 *
 * Two design choices:
 *
 * 1. A single color. A pocket above its target is neither better nor worse
 *    than one below: only the magnitude matters. Coloring by sign would pass
 *    a judgment the data doesn't carry.
 * 2. The scale is symmetric around zero. An axis framed on the values
 *    present alone would visually exaggerate the smallest drift.
 *
 * No trigger threshold is drawn: the service publishes none. An invented
 * "threshold" line would read as a management rule.
 */

export type DerivePoche = {
  readonly poche: string
  /** Target share per the contract, in percent. */
  readonly cible: number
  /** Actual on-chain share, in percent. */
  readonly constate: number
  /** Signed drift, actual − target, in percentage points. */
  readonly ecart: number
}

const ACCENT = chartTheme.series.primary

function formatValue(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2 })
}

function formatSignedDrift(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2, signDisplay: 'always' })
}

/** The direction of the drift, spelled out — color alone doesn't say it. */
function driftDirection(value: number): string {
  if (value < 0) return 'below target'
  if (value > 0) return 'above target'
  return 'on target'
}

/** Symmetric scale, rounded up to the nearest tenth, never zero. */
function axisRange(poches: readonly DerivePoche[]): number {
  let amplitude = 0
  for (const p of poches) {
    const absolute = Math.abs(p.ecart)
    if (absolute > amplitude) amplitude = absolute
  }
  return Math.max(Math.ceil(amplitude * 12) / 10, 0.1)
}

/**
 * Ticks imposed explicitly, not left to the library.
 *
 * Left to itself, recharts picks a "round" step that skips zero: the axis
 * showed −2.6 / −0.6 / 1.4 while zero is precisely the reference the reader
 * is looking for. It's forced here, with two symmetric ticks on either side.
 */
function axisTicks(range: number): readonly number[] {
  return [-range, -range / 2, 0, range / 2, range]
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: DerivePoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const poche = payload[0]?.payload
  if (poche === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{poche.poche}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">Target: {formatValue(poche.cible)}%</p>
      <p className="text-zinc-600 tabular-nums dark:text-zinc-300">Actual: {formatValue(poche.constate)}%</p>
      <p className="mt-0.5 font-medium text-zinc-950 tabular-nums dark:text-white">
        Drift: {formatSignedDrift(poche.ecart)} pt
      </p>
    </div>
  )
}

export function DerivePochesChart({ poches }: Readonly<{ poches: readonly DerivePoche[] }>) {
  if (poches.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No drift could be read pocket by pocket. Nothing is plotted rather than a drift shown as zero.
      </p>
    )
  }

  const data = [...poches]
  const range = axisRange(poches)

  return (
    <div className="px-2 py-4">
      {/* The only screen-reader- and keyboard-accessible version: the chart
          itself is decorative, the table carries the numbers. Wrapped in a
          div (not applied to the table itself): a <table> with
          table-layout:auto ignores an explicit width/max-width and sizes to
          its content regardless, so the sr-only 1px clip only holds when it's
          on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Drift between target allocation and actual allocation, by pocket, in percentage points</caption>
          <thead>
            <tr>
              <th scope="col">Pocket</th>
              <th scope="col">Target</th>
              <th scope="col">Actual</th>
              <th scope="col">Drift</th>
            </tr>
          </thead>
          <tbody>
            {poches.map((p) => (
              <tr key={p.poche}>
                <th scope="row">{p.poche}</th>
                <td>{formatValue(p.cible)}%</td>
                <td>{formatValue(p.constate)}%</td>
                <td>{formatSignedDrift(p.ecart)} points</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className={`${chartTheme.height.small} w-full sm:${chartTheme.height.medium}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={chartTheme.margin}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-range, range]}
              ticks={[...axisTicks(range)]}
              tickFormatter={(value: number) => `${formatValue(value)} pt`}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="poche"
              width={110}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* The target, made visible: left of the line, the pocket is below
                target; right of it, above. */}
            <ReferenceLine x={0} stroke={chartTheme.series.reference} strokeWidth={1} />
            {/* Animation off: consistent with the console's other charts, and a
                screenshot never catches an empty graph mid-transition. */}
            <Bar dataKey="ecart" fill={ACCENT} radius={2} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Color says nothing about the sign: the values are spelled out. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-3 text-xs text-zinc-500 dark:text-zinc-400">
        {poches.map((p) => (
          <li key={p.poche} className="tabular-nums">
            <span className="text-zinc-700 dark:text-zinc-300">{p.poche}</span> {formatSignedDrift(p.ecart)} pt
            <span className="text-zinc-500 dark:text-zinc-500"> ({driftDirection(p.ecart)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
