'use client'

import { categoricalColor, chartHeight, chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'

/**
 * Horizontal distribution — movement types or strategic pockets.
 * Real data only; no invented series.
 *
 * ── Palette ──────────────────────────────────────────────────────────────
 * Six ordinary categories used to get six different hues (green, grey, teal,
 * orange, red, dark green): a rainbow that made "Deposit" look healthy and
 * "Withdrawal" look dangerous when neither claim was being made. They are
 * now drawn from `categoricalColor`, a mint→neutral ramp, so hue separates
 * the rows without asserting anything about them.
 *
 * ── Height ───────────────────────────────────────────────────────────────
 * The canvas is derived from the row count (`chartHeight('rows', n)`) rather
 * than pinned to one class. A fixed 220px frame left a large empty region
 * under six bars — and cramped them at three.
 *
 * ── Labels ───────────────────────────────────────────────────────────────
 * Each bar carries its value at its end, so the numeric axis is dropped
 * entirely: an axis exists to let the eye estimate a value, and there is
 * nothing left to estimate. The category axis is sized to the longest label
 * so Recharts stops wrapping tick text onto two lines.
 */

export type BarreRepartition = {
  readonly nom: string
  readonly valeur: number
}

type BarreAvecFill = BarreRepartition & { readonly fill: string }

/**
 * Category-axis sizing. Recharts wraps tick text at the axis `width`, so the
 * width has to be measured, not guessed: ~6.2px per character at 11px in the
 * console's UI font, plus breathing room, capped so one very long label can
 * never eat the plot area.
 */
const CHAR_WIDTH_PX = 6.2
const Y_AXIS_MIN = 64
const Y_AXIS_MAX = 156

function largeurAxeCategories(noms: readonly string[]): number {
  const plusLong = Math.max(...noms.map((n) => n.length))
  return Math.min(Y_AXIS_MAX, Math.max(Y_AXIS_MIN, Math.ceil(plusLong * CHAR_WIDTH_PX) + 12))
}

export function DistributionBarChart({
  barres,
  unit = '',
}: Readonly<{ barres: readonly BarreRepartition[]; unit?: string }>) {
  if (barres.length === 0) {
    return <p className="px-5 pb-5 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">No data to display.</p>
  }

  const data: BarreAvecFill[] = [...barres]
    .sort((a, b) => b.valeur - a.valeur)
    .map((barre, index) => ({ ...barre, fill: categoricalColor(index) }))
  const hauteur = chartHeight('rows', data.length)
  const largeurAxe = largeurAxeCategories(data.map((b) => b.nom))

  return (
    <div className="px-5 pb-5 sm:px-6">
      {/* Only version a screen reader or keyboard can reach. Wrapped in a
          div, not applied to the table itself: a <table> sizes to its
          content regardless of width/max-width, so the sr-only 1px clip
          only holds on a non-table wrapper. */}
      <div className="sr-only">
        <table>
          <caption>Distribution by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.nom}>
                <th scope="row">{b.nom}</th>
                <td>
                  {formatNumber(b.valeur)}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" className="w-full" style={{ height: hauteur }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Wider right margin than the shared base: the value labels live
              outside the bars and would be clipped at the plot edge. */}
          <BarChart data={data} layout="vertical" margin={{ ...chartTheme.margin, right: 52, left: 0 }}>
            {/* Declared and hidden: a vertical layout needs a numeric X
                scale, but the direct labels make its ticks redundant. */}
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nom"
              width={largeurAxe}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            {/* Animation disabled, as everywhere in the console: a bar that
                grows from zero delays reading without teaching anything. */}
            <Bar dataKey="valeur" radius={[0, 3, 3, 0]} maxBarSize={20} isAnimationActive={false}>
              <LabelList
                dataKey="valeur"
                position="right"
                offset={8}
                fill={chartTheme.tick}
                fontSize={chartTheme.axisFontSize}
                formatter={(valeur) => (typeof valeur === 'number' ? `${formatNumber(valeur)}${unit}` : valeur)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
