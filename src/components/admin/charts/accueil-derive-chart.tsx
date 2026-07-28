'use client'

import { chartHeight, chartTheme } from '@/lib/chart-theme'
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
 * "Has the portfolio drifted from its target, and on which side?"
 *
 * The target-vs-actual chart answers "where is the money"; it doesn't show
 * at a glance WHICH pocket is slipping. Drift, on the other hand, is a
 * signed gap: a bar starting from zero toward the left (under-allocated) or
 * toward the right (over-allocated) reads without comparing two heights.
 *
 * The unit shown is the percentage POINT (bps / 100), because that's how
 * drift gets discussed in committee — "two points below target" — not in
 * basis points.
 *
 * The backend exposes NO contractual rebalancing tolerance. The threshold
 * below is therefore a READING threshold, presented as such and named in the
 * chart's own legend: it colors, it does not claim to be a contract rule.
 *
 * ── Why exactly two tones, and why one of them may be semantic ────────────
 * A colour is allowed to be alarming here only because the bar it paints
 * genuinely crossed the threshold this component states. So there are two
 * tones and no third: below the threshold a bar carries no verdict and takes
 * the ordinary data mint (`chartTheme.dataSeries.brandPrimary`); at or above
 * it, the bar takes `chartTheme.semantic.warning`, the token reserved for
 * exactly that claim. Nothing else on the canvas borrows a semantic colour —
 * the zero reference, the ticks and the grid come from the neutral data
 * tokens, and no hex is written by hand.
 *
 * ── Why the canvas is short, and why the numbers are on the bars ──────────
 * Height is derived from the number of pockets (`chartHeight('rows', n)`)
 * rather than fixed: three pockets get three rows of canvas instead of
 * floating in a box sized for twelve. And each bar carries its own value, so
 * the chart reads without hovering — the tooltip adds the pocket's full
 * name, it is not where the number lives.
 */

/** Gap from which a pocket is flagged. Reading threshold, not a contract. */
export const SEUIL_DERIVE_ATTENTION_BPS = 200
/** Beyond this, the gap stops being an observation and becomes a decision. */
export const SEUIL_DERIVE_CRITIQUE_BPS = 500

/** No verdict: the ordinary measurement colour. */
const TON_DANS_PLAGE = chartTheme.dataSeries.brandPrimary
/** A verdict, and the only one this chart is entitled to make. */
const TON_SIGNALE = chartTheme.semantic.warning

export type PocheDerive = {
  readonly poche: string
  readonly libelle: string
  readonly deriveBps: number
}

type BarreDerive = {
  readonly poche: string
  readonly libelle: string
  readonly points: number
  readonly attention: boolean
  readonly fill: string
}

function formatPoints(points: number): string {
  const sign = points > 0 ? '+' : ''
  return `${sign}${formatNumber(points, { maximumFractionDigits: 2 })} pt`
}

/**
 * Signed, and without the unit: the unit is stated once, in the frame around
 * the chart. Repeating "pt" on every tick and every bar turns the canvas into
 * a wall of suffixes.
 */
function formatPointsCompact(points: number): string {
  return formatNumber(points, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
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

function pointsDe(entry: ValeurEtiquette): number | null {
  const brut = entry.value
  if (typeof brut !== 'number' || !Number.isFinite(brut)) return null
  return brut
}

function etiquetteVersLaDroite(entry: ValeurEtiquette): string | null {
  const points = pointsDe(entry)
  if (points === null || points < 0) return null
  return formatPointsCompact(points)
}

function etiquetteVersLaGauche(entry: ValeurEtiquette): string | null {
  const points = pointsDe(entry)
  if (points === null || points >= 0) return null
  return formatPointsCompact(points)
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: BarreDerive }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const barre = payload[0]?.payload
  if (barre === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{barre.libelle}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
        {formatPoints(barre.points)}
        {' '}
        {barre.points < 0 ? 'below target' : 'above target'}
      </p>
    </div>
  )
}

export function AccueilDeriveChart({ poches }: Readonly<{ poches: readonly PocheDerive[] }>) {
  if (poches.length === 0) {
    return (
      // Left-aligned and sized to its sentence, exactly like the empty state
      // `ChartFrame` renders around it: two absences that look different are
      // read as two different problems.
      <p className="px-5 pb-5 text-xs leading-relaxed text-zinc-500 sm:px-6 dark:text-zinc-400">
        No readable drift. Nothing is plotted rather than a bar at zero, which would read as “pocket perfectly
        aligned.”
      </p>
    )
  }

  const barres: BarreDerive[] = poches.map((p) => ({
    poche: p.poche,
    libelle: p.libelle,
    points: p.deriveBps / 100,
    attention: Math.abs(p.deriveBps) >= SEUIL_DERIVE_ATTENTION_BPS,
    fill: Math.abs(p.deriveBps) >= SEUIL_DERIVE_ATTENTION_BPS ? TON_SIGNALE : TON_DANS_PLAGE,
  }))

  // Axis symmetric around zero: without it, a single pocket in negative
  // drift would occupy the full width and look catastrophic. The 1.35 factor
  // is not decoration — it is the room the direct value labels need at the
  // outer end of the longest bar, inside the plot area.
  const amplitude = Math.max(1, ...barres.map((b) => Math.abs(b.points)))
  const borne = Math.ceil(amplitude * 13.5) / 10

  // Ticks imposed, never left to the library: on its own recharts picks a
  // "round" step that skips zero, and zero is precisely the reference the
  // reader is looking for.
  const graduations = [-borne, -borne / 2, 0, borne / 2, borne]

  return (
    <div className="px-5 pb-5 sm:px-6">
      {/* Only version readable by screen reader and keyboard. Wrapped in a
          div, not applied to the table itself: a <table> ignores
          width/max-width and sizes to its content regardless, so the
          sr-only 1px clip only holds on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Gap between actual and target allocation, by pocket, in percentage points</caption>
          <thead>
            <tr>
              <th scope="col">Pocket</th>
              <th scope="col">Gap</th>
              <th scope="col">Reading</th>
            </tr>
          </thead>
          <tbody>
            {barres.map((b) => (
              <tr key={b.poche}>
                <th scope="row">{b.libelle}</th>
                <td>{formatPoints(b.points)}</td>
                <td>{b.attention ? 'flagged' : 'within reading range'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('rows', barres.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Base margin from the shared token, with the vertical padding
              tightened and the left edge given up entirely: the category axis
              reserves its own width, so a left margin on top of it would only
              push the bars away from their labels. */}
          <BarChart data={barres} layout="vertical" margin={{ ...chartTheme.margin, top: 4, bottom: 4, left: 0 }}>
            {/* Vertical rules only, at the ticks, and faint: they situate a
                value, they are not part of the data. */}
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-borne, borne]}
              ticks={graduations}
              tickFormatter={formatPointsCompact}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            {/* The short pocket code, not its full label: this chart lives in
                the narrow column of the home screen, and a wrapped or clipped
                name would cost more width than it returns. The full name is
                in the tooltip and in the table above. */}
            <YAxis
              type="category"
              dataKey="poche"
              width={44}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine x={0} stroke={chartTheme.dataSeries.dataReference} strokeWidth={1} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation disabled, as everywhere in the console: a bar that
                grows from zero delays reading without teaching anything. */}
            <Bar dataKey="points" radius={2} maxBarSize={16} isAnimationActive={false}>
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

      {/* Colour never carries the information alone: the legend names the
          threshold that earns the second tone, and the table above gives the
          reading pocket by pocket. Left-aligned on the card's text column, so
          it reads as a footnote to the chart rather than a caption centred
          under a picture. */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: TON_DANS_PLAGE }} />
          {' '}
          Within reading range
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: TON_SIGNALE }} />
          {' '}
          Flagged — gap of at least {SEUIL_DERIVE_ATTENTION_BPS / 100} pt
        </li>
      </ul>
    </div>
  )
}
