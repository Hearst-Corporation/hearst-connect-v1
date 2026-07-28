'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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
 * below is therefore a READING threshold, presented as such and announced
 * in the chart frame: it colors, it does not claim to be a contract rule.
 */

/** Gap from which a pocket is flagged. Reading threshold, not a contract. */
export const SEUIL_DERIVE_ATTENTION_BPS = 200
/** Beyond this, the gap stops being an observation and becomes a decision. */
export const SEUIL_DERIVE_CRITIQUE_BPS = 500

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
}

function formatPoints(points: number): string {
  const sign = points > 0 ? '+' : ''
  return `${sign}${formatNumber(points, { maximumFractionDigits: 2 })} pt`
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: BarreDerive }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const barre = payload[0]?.payload
  if (barre === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{barre.libelle}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
        {formatPoints(barre.points)} {barre.points < 0 ? 'below target' : 'above target'}
      </p>
    </div>
  )
}

export function AccueilDeriveChart({ poches }: Readonly<{ poches: readonly PocheDerive[] }>) {
  if (poches.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
  }))

  // Axis symmetric around zero: without it, a single pocket in negative
  // drift would occupy the full width and look catastrophic.
  const amplitude = Math.max(1, ...barres.map((b) => Math.abs(b.points)))
  const borne = Math.ceil(amplitude * 1.25 * 10) / 10

  return (
    <div className="px-2 py-4">
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

      <div aria-hidden="true" className={`${chartTheme.height.small} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Tighter than the shared base margin: this is a compact,
              single-row-per-pocket list, and the narrow category axis
              (width=40) already reserves its own space. */}
          <BarChart data={barres} layout="vertical" margin={{ ...chartTheme.margin, top: 4, right: 12, bottom: 4, left: 4 }}>
            <XAxis
              type="number"
              domain={[-borne, borne]}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              unit=" pt"
            />
            <YAxis
              type="category"
              dataKey="poche"
              width={40}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine x={0} stroke={chartTheme.series.reference} strokeWidth={1} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation disabled, as everywhere in the console: a bar that
                grows from zero delays reading without teaching anything. */}
            <Bar dataKey="points" radius={2} maxBarSize={18} isAnimationActive={false}>
              {barres.map((b) => (
                <Cell
                  key={b.poche}
                  fill={b.attention ? chartTheme.series.warning : chartTheme.series.primary}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Color never carries the information alone: the legend names the
          threshold, and the table above gives the reading pocket by pocket. */}
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: chartTheme.series.primary }}
          />
          Within reading range
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: chartTheme.series.warning }}
          />
          Flagged — gap of at least {SEUIL_DERIVE_ATTENTION_BPS / 100} pt
        </li>
      </ul>
    </div>
  )
}
