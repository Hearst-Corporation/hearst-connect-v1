'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
 * Three design choices:
 *
 * 1. A single colour, and an ordinary one. A pocket above its target is
 *    neither better nor worse than one below: only the magnitude matters.
 *    Colouring by sign would pass a judgment the data doesn't carry, and
 *    reaching for a semantic tone (green, orange, red) would claim a verdict
 *    this page has no threshold to back. The bars therefore use
 *    `chartTheme.dataSeries.brandPrimary`, and the zero reference uses
 *    `dataSeries.dataReference` — measurement colours, no alarm.
 * 2. The scale is symmetric around zero. An axis framed on the values
 *    present alone would visually exaggerate the smallest drift.
 * 3. Every bar is labelled with its own value. A drift chart whose numbers
 *    only appear on hover is a picture, not a reading — and the operations
 *    page is read, printed and screenshotted.
 *
 * No trigger threshold is drawn: the service publishes none. An invented
 * "threshold" line would read as a management rule.
 *
 * The plot height comes from `chartHeight('rows', n)`: with three pockets it
 * is three rows tall, not a fixed box with empty air below the last bar.
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

/** Ordinary measurement, no verdict: mint, never a semantic tone. */
const TON_MESURE = chartTheme.dataSeries.brandPrimary

function formatValue(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2 })
}

function formatSignedDrift(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2, signDisplay: 'always' })
}

/**
 * Signed, and without the unit: "pt" is stated once by the frame around the
 * chart. Repeating it on five ticks and every bar turns the canvas into a
 * wall of suffixes.
 */
function formatDriftCompact(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })
}

/** The direction of the drift, spelled out — colour alone doesn't say it. */
function driftDirection(value: number): string {
  if (value < 0) return 'below target'
  if (value > 0) return 'above target'
  return 'on target'
}

/**
 * Symmetric scale, never zero.
 *
 * The 1.35 factor is not padding for looks: it is the room the direct value
 * labels need at the outer end of the longest bar, inside the plot area.
 */
function axisRange(poches: readonly DerivePoche[]): number {
  let amplitude = 0
  for (const p of poches) {
    const absolute = Math.abs(p.ecart)
    if (absolute > amplitude) amplitude = absolute
  }
  return Math.max(Math.ceil(amplitude * 13.5) / 10, 0.1)
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

/**
 * Direct value labels, in two passes.
 *
 * Recharts positions a whole label list at once, but a diverging bar wants
 * its label at the OUTER end — right of a positive bar, left of a negative
 * one. So two lists are rendered, and each accessor returns `null` for the
 * sign it doesn't own; recharts draws nothing for a null label.
 */
type ValeurEtiquette = Readonly<{ value: unknown }>

function ecartDe(entry: ValeurEtiquette): number | null {
  const brut = entry.value
  if (typeof brut !== 'number' || !Number.isFinite(brut)) return null
  return brut
}

function etiquetteVersLaDroite(entry: ValeurEtiquette): string | null {
  const ecart = ecartDe(entry)
  if (ecart === null || ecart < 0) return null
  return formatDriftCompact(ecart)
}

function etiquetteVersLaGauche(entry: ValeurEtiquette): string | null {
  const ecart = ecartDe(entry)
  if (ecart === null || ecart >= 0) return null
  return formatDriftCompact(ecart)
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: DerivePoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const poche = payload[0]?.payload
  if (poche === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
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
      // Left-aligned and sized to its sentence, exactly like the empty state
      // `ChartFrame` renders around it: two absences that look different get
      // read as two different problems.
      <p className="px-5 pb-5 text-xs leading-relaxed text-zinc-500 sm:px-6 dark:text-zinc-400">
        No drift could be read pocket by pocket. Nothing is plotted rather than a drift shown as zero.
      </p>
    )
  }

  const data = [...poches]
  const range = axisRange(poches)

  return (
    <div className="px-5 pb-5 sm:px-6">
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
              <th scope="col">Direction</th>
            </tr>
          </thead>
          <tbody>
            {poches.map((p) => (
              <tr key={p.poche}>
                <th scope="row">{p.poche}</th>
                <td>{formatValue(p.cible)}%</td>
                <td>{formatValue(p.constate)}%</td>
                <td>{formatSignedDrift(p.ecart)} points</td>
                <td>{driftDirection(p.ecart)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('rows', poches.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Base margin from the shared token, with the vertical padding
              tightened and the left edge given up entirely: the category axis
              reserves its own width, so a left margin on top of it would only
              push the bars away from their labels. */}
          <BarChart data={data} layout="vertical" margin={{ ...chartTheme.margin, top: 4, bottom: 4, left: 0 }}>
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
              tickFormatter={formatDriftCompact}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            {/* Wide enough for "S0 · Aave USDC": this chart owns the full
                width of its section, so the room spent on real pocket names
                costs the plot almost nothing. */}
            <YAxis
              type="category"
              dataKey="poche"
              width={128}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* The target, made visible: left of the line, the pocket is below
                target; right of it, above. */}
            <ReferenceLine x={0} stroke={chartTheme.dataSeries.dataReference} strokeWidth={1} />
            {/* Animation off: consistent with the console's other charts, and a
                screenshot never catches an empty graph mid-transition. */}
            <Bar dataKey="ecart" fill={TON_MESURE} radius={2} maxBarSize={18} isAnimationActive={false}>
              <LabelList
                position="right"
                offset={6}
                fill={chartTheme.tick}
                fontSize={chartTheme.axisFontSize}
                valueAccessor={etiquetteVersLaDroite}
              />
              <LabelList
                position="left"
                offset={6}
                fill={chartTheme.tick}
                fontSize={chartTheme.axisFontSize}
                valueAccessor={etiquetteVersLaGauche}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* One line replaces the former pocket-by-pocket list: every value is
          now written on its own bar, so repeating them underneath was the
          same fact stated twice. What the bars can't say — which side means
          what — is what stays. */}
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Right of zero, the pocket sits above its target; left of zero, below it. Values in percentage points.
      </p>
    </div>
  )
}
