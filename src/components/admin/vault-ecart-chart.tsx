'use client'

import { chartHeight, chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * "How far off target is each pocket?"
 *
 * The deviation table right below gives the exact figures. This chart
 * doesn't repeat them: it gives the one thing a column of numbers can't —
 * the SIGN and relative MAGNITUDE of the deviation, read at a glance on a
 * zero-centered axis. Numbers in the table, shape in the chart: each does
 * its own job. The value written at the end of each bar is the exception,
 * and a deliberate one: a chart whose figures only exist on hover is not
 * readable on a printout or a screenshot.
 *
 * ── Why a symmetric axis with a minimum bound ──────────────────────────────
 * An auto-scaled axis would render a 0.68-point deviation as dramatically as
 * a 15-point one: the bar would fill the frame either way. On a financial
 * product, that framing reads as an alarm where there isn't one. So the axis
 * is symmetric (a +2 deviation and a -2 deviation have exactly the same
 * length) and bounded to at least ±3 points, so small deviations LOOK like
 * small deviations. The extra headroom past the largest deviation is not
 * decoration either: it is the room the direct value labels occupy at the
 * outer end of the longest bar, inside the plot area.
 *
 * ── Why a drawn tolerance band ──────────────────────────────────────────────
 * The neutral ±1-point band marks the threshold this page's deviation
 * reading already uses. Without it, the reader has no way to know at what
 * point a bar deserves attention.
 *
 * ── Why some bars are allowed an alarming colour ───────────────────────────
 * Because they crossed a threshold this chart draws. A pocket inside the
 * band makes no claim and takes the ordinary measurement mint
 * (`chartTheme.dataSeries.brandPrimary`); past the band it takes
 * `semantic.warning`, and past the correction threshold `semantic.critical`.
 * Those two tones are spent on a breached threshold and a drift that needs
 * acting on — which is exactly what they are reserved for. Everything that
 * isn't a verdict (band, zero line, ticks, grid) stays on the neutral data
 * tokens.
 *
 * Colour never carries the information alone: every pocket is paired with its
 * status word (`mot`), rendered in the tooltip and in the screen-reader
 * table.
 */

export type NiveauEcart = 'conforme' | 'modere' | 'a-corriger'

export type EcartPoche = {
  readonly poche: string
  readonly label: string
  /** Signed deviation, in percentage points: actual minus target. */
  readonly ecart: number
  readonly niveau: NiveauEcart
  /** The word that states the status — colour only reinforces it. */
  readonly mot: string
}

/**
 * One role per level. `conforme` is not "success", it is simply the ordinary
 * reading — so it gets the measurement colour, not a green one, and the two
 * semantic tokens stay available for the levels that genuinely earn them.
 */
const LEVEL_COLOR: Record<NiveauEcart, string> = {
  conforme: chartTheme.dataSeries.brandPrimary,
  modere: chartTheme.semantic.warning,
  'a-corriger': chartTheme.semantic.critical,
}

/** Below this threshold, the deviation is within tolerance: the band shows it. */
const TOLERANCE_PT = 1

/** No axis narrower than ±3 pt: see the framing note above. */
const MIN_BOUND_PT = 3

function formatDeviationPoints(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, { maximumFractionDigits: 2 })} pt`
}

/**
 * Signed, and without the unit: "pt" is stated once by the frame around the
 * chart, so ticks and bar labels don't each carry a suffix.
 */
function formatDeviationCompact(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })
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
  return formatDeviationCompact(ecart)
}

function etiquetteVersLaGauche(entry: ValeurEtiquette): string | null {
  const ecart = ecartDe(entry)
  if (ecart === null || ecart >= 0) return null
  return formatDeviationCompact(ecart)
}

function DeviationTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: EcartPoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const pocket = payload[0]?.payload
  if (pocket === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{pocket.label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">{formatDeviationPoints(pocket.ecart)}</p>
      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{pocket.mot}</p>
    </div>
  )
}

export function VaultEcartChart({ ecarts }: Readonly<{ ecarts: readonly EcartPoche[] }>) {
  if (ecarts.length === 0) {
    return (
      // Left-aligned and sized to its sentence, exactly like the empty state
      // `ChartFrame` renders around it: two absences that look different get
      // read as two different problems.
      <p className="px-5 pb-5 text-xs leading-relaxed text-zinc-500 sm:px-6 dark:text-zinc-400">
        No deviation could be read from the chain. Nothing is drawn rather than a bar at zero, which would read
        as “pocket perfectly on target.”
      </p>
    )
  }

  const magnitude = Math.max(...ecarts.map((e) => Math.abs(e.ecart)))
  const bound = Math.max(MIN_BOUND_PT, Math.ceil(magnitude * 1.35))
  const graduations = [-bound, -bound / 2, 0, bound / 2, bound]

  return (
    <div className="px-5 pb-5 sm:px-6">
      {/* The table isn't a duplicate of the chart: it's the chart's only
          keyboard- and screen-reader-accessible version. Hidden from sight,
          never from assistive tech. Wrapped in a div, not applied to the
          table itself: a <table> ignores width/max-width and sizes to its
          content regardless, so the sr-only 1px clip only holds on a
          non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Deviation between actual and target allocation, by pocket, in percentage points</caption>
          <thead>
            <tr>
              <th scope="col">Pocket</th>
              <th scope="col">Deviation</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {ecarts.map((e) => (
              <tr key={e.poche}>
                <th scope="row">{e.label}</th>
                <td>{formatDeviationPoints(e.ecart)}</td>
                <td>{e.mot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* One row per pocket, from the shared height scale: three pockets get
          three rows of canvas, not a fixed box with air under the last bar. */}
      <div aria-hidden="true" className="w-full" style={{ height: chartHeight('rows', ecarts.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...ecarts]}
            layout="vertical"
            // Base margin from the shared token, with the vertical padding
            // tightened and the left edge given up entirely: the category
            // axis reserves its own width via `width`, so a left margin on
            // top of it would only push the bars away from their labels.
            margin={{ ...chartTheme.margin, top: 4, bottom: 4, left: 0 }}
          >
            {/* The tolerance band is drawn BEFORE the bars: it's reading
                chrome, not a data series — hence a neutral fill, never a
                semantic one. */}
            <ReferenceArea
              x1={-TOLERANCE_PT}
              x2={TOLERANCE_PT}
              fill={chartTheme.dataSeries.neutralRaised}
              fillOpacity={0.14}
              ifOverflow="hidden"
            />
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-bound, bound]}
              ticks={graduations}
              tickFormatter={formatDeviationCompact}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <ReferenceLine x={0} stroke={chartTheme.dataSeries.dataReference} strokeWidth={1} />
            <Tooltip content={<DeviationTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation off, as everywhere in the console: a bar growing
                from zero delays reading and leaves a screenshot caught on an
                empty chart. */}
            <Bar dataKey="ecart" radius={2} maxBarSize={18} isAnimationActive={false}>
              {ecarts.map((e) => (
                <Cell key={e.poche} fill={LEVEL_COLOR[e.niveau]} />
              ))}
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

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Shaded band: ±{TOLERANCE_PT}-point tolerance. Right of zero, the pocket is ahead of its target; left of
        zero, it&apos;s behind. Values in percentage points.
      </p>
    </div>
  )
}
