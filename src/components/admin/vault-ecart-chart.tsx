'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import {
  Bar,
  BarChart,
  Cell,
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
 * its own job.
 *
 * ── Why a symmetric axis with a minimum bound ──────────────────────────────
 * An auto-scaled axis would render a 0.68-point deviation as dramatically as
 * a 15-point one: the bar would fill the frame either way. On a financial
 * product, that framing reads as an alarm where there isn't one. So the axis
 * is symmetric (a +2 deviation and a -2 deviation have exactly the same
 * length) and bounded to at least ±3 points, so small deviations LOOK like
 * small deviations.
 *
 * ── Why a drawn tolerance band ──────────────────────────────────────────────
 * The gray ±1-point band marks the threshold this page's deviation reading
 * already uses. Without it, the reader has no way to know at what point a
 * bar deserves attention.
 *
 * Color never carries the information alone: every pocket is paired with its
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
  /** The word that states the status — color only reinforces it. */
  readonly mot: string
}

const LEVEL_COLOR: Record<NiveauEcart, string> = {
  conforme: chartTheme.series.positive,
  modere: chartTheme.series.secondary,
  'a-corriger': chartTheme.series.warning,
}

/** Below this threshold, the deviation is within tolerance: the band shows it. */
const TOLERANCE_PT = 1

/** No axis narrower than ±3 pt: see the framing note above. */
const MIN_BOUND_PT = 3

function formatDeviationPoints(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, { maximumFractionDigits: 2 })} pt`
}

function DeviationTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: EcartPoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const pocket = payload[0]?.payload
  if (pocket === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{pocket.label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">{formatDeviationPoints(pocket.ecart)}</p>
      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{pocket.mot}</p>
    </div>
  )
}

export function VaultEcartChart({ ecarts }: Readonly<{ ecarts: readonly EcartPoche[] }>) {
  if (ecarts.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No deviation could be read from the chain. Nothing is drawn rather than a bar at zero, which would read
        as “pocket perfectly on target.”
      </p>
    )
  }

  const magnitude = Math.max(...ecarts.map((e) => Math.abs(e.ecart)))
  const bound = Math.max(MIN_BOUND_PT, Math.ceil(magnitude))
  // One row per pocket, never shorter than a readable frame.
  const height = Math.max(150, ecarts.length * 52 + 44)

  return (
    <div className="px-2 py-4">
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

      <div aria-hidden="true" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...ecarts]}
            layout="vertical"
            // Tighter top/bottom than the shared default: with a dynamic
            // per-row height, that room is better spent on bar rows. Left
            // stays at 0 because the YAxis already reserves label space via
            // its own `width`.
            margin={{ ...chartTheme.margin, top: 4, bottom: 4, left: 0 }}
          >
            {/* The tolerance band is drawn BEFORE the bars: it's reading
                chrome, not a data series. */}
            <ReferenceArea
              x1={-TOLERANCE_PT}
              x2={TOLERANCE_PT}
              fill={chartTheme.series.ghost}
              fillOpacity={0.14}
              ifOverflow="hidden"
            />
            <XAxis
              type="number"
              domain={[-bound, bound]}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              unit=" pt"
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <ReferenceLine x={0} stroke={chartTheme.tick} strokeOpacity={0.45} />
            <Tooltip content={<DeviationTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation off, as everywhere in the console: a bar growing
                from zero delays reading and leaves a screenshot caught on an
                empty chart. */}
            <Bar dataKey="ecart" radius={2} maxBarSize={22} isAnimationActive={false}>
              {ecarts.map((e) => (
                <Cell key={e.poche} fill={LEVEL_COLOR[e.niveau]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 px-3 text-xs text-zinc-500 dark:text-zinc-400">
        Gray band: ±{TOLERANCE_PT}-point tolerance. Right of zero, the pocket is ahead of its target; left of
        zero, it&apos;s behind.
      </p>
    </div>
  )
}
