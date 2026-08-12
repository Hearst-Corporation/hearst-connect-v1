'use client'

import { categoricalColor } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

/**
 * richart — strategy EXPOSURE donut: target vs actual, on an absolute
 * 0–100%-of-vault angular scale (Recharts behind the charts boundary).
 *
 * ── Why not a plain pie of "actual" ───────────────────────────────────────────
 * Targets sum to 100% of the vault (a full plan); actuals do NOT — the deployed
 * share can be < 100% (idle capital), and a pocket's actual can be unread. A
 * normalized `<Pie dataKey="actual">` would divide by the present sum and inflate
 * 87.6%-deployed to a full 360° circle — a lie. So both rings here are laid on an
 * ABSOLUTE scale: every pocket occupies exactly `targetPct/100` of the circle, and
 * the unfilled angle stays as a neutral track — never redistributed, never a
 * fabricated "unallocated" wedge (the source carries no remainder field).
 *
 *   inner ring  = TARGET  — each pocket's full angular slot (category color).
 *   outer ring  = ACTUAL  — the SAME slot, filled to `min(actual, target)` in the
 *                 pocket's color; the shortfall (drift) shows as the neutral track.
 *
 * Honest by construction:
 *  - `actualPct === null` → no fill at all (never coerced to 0); the slot is all
 *    track and the legend reads "—".
 *  - actual > target (over-allocation) → the slot caps at full; the exact +drift is
 *    printed in the legend, so nothing is hidden or fabricated.
 *  - the deployed-total center only shows when EVERY actual is readable; otherwise
 *    it shows the pocket count, never a summed-with-holes number.
 */

export type ExposureItem = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}

const TRACK = 'var(--color-console-fill-muted)'
/** A hair of separation so contiguous slots read as distinct bands on dark glass. */
const SEP = 'var(--color-console-surface)'

type Slot = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
  readonly color: string
}

export function HearstExposureDonut({ items }: Readonly<{ items: readonly ExposureItem[] }>) {
  const slots: readonly Slot[] = items.map((p, i) => ({
    label: p.label,
    targetPct: p.targetPct,
    actualPct: p.actualPct,
    color: categoricalColor(i),
  }))

  const sumTarget = slots.reduce((s, p) => s + p.targetPct, 0)
  // Absolute scale: pad the ring to 100 so each arc = pct/100 of the circle. When
  // the plan itself sums to < 100, the pad is a truthful "unplanned" neutral gap.
  const planPad = Math.max(0, 100 - sumTarget)

  // Inner ring — target slots.
  const targetRing = [
    ...slots.map((p) => ({ key: `t:${p.label}`, value: p.targetPct, color: p.color })),
    ...(planPad > 0.05 ? [{ key: 't:__pad', value: planPad, color: TRACK }] : []),
  ]

  // Outer ring — actual filled within each target slot; shortfall = neutral track.
  const actualRing = [
    ...slots.flatMap((p) => {
      const filled = p.actualPct === null ? 0 : Math.min(p.actualPct, p.targetPct)
      const rest = Math.max(0, p.targetPct - filled)
      const parts: { key: string; value: number; color: string }[] = []
      if (filled > 0.05) parts.push({ key: `a:${p.label}:fill`, value: filled, color: p.color })
      if (rest > 0.05) parts.push({ key: `a:${p.label}:rest`, value: rest, color: TRACK })
      // A fully-empty slot (target 0) contributes nothing; a null/zero-actual slot
      // is entirely track above — never a coloured zero.
      return parts
    }),
    ...(planPad > 0.05 ? [{ key: 'a:__pad', value: planPad, color: TRACK }] : []),
  ]

  const readable = slots.filter((p) => p.actualPct !== null)
  const allReadable = readable.length === slots.length && slots.length > 0
  const deployed = readable.reduce((s, p) => s + (p.actualPct as number), 0)
  const centerValue = allReadable ? `${formatNumber(deployed, { maximumFractionDigits: 0 })}%` : formatNumber(slots.length)
  const centerLabel = allReadable ? 'deployed' : slots.length === 1 ? 'strategy' : 'strategies'

  const drift = (p: Slot): number | null => (p.actualPct === null ? null : p.actualPct - p.targetPct)

  return (
    <div className="mx-auto max-w-sm">
      <div className="sr-only">
        <table>
          <caption>Strategy exposure — target and actual as percent of vault, and drift</caption>
          <thead>
            <tr>
              <th scope="col">Strategy</th>
              <th scope="col">Target</th>
              <th scope="col">Actual</th>
              <th scope="col">Drift</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((p) => {
              const d = drift(p)
              return (
                <tr key={p.label}>
                  <th scope="row">{p.label}</th>
                  <td>{formatNumber(p.targetPct, { maximumFractionDigits: 1 })}%</td>
                  <td>{p.actualPct === null ? '—' : `${formatNumber(p.actualPct, { maximumFractionDigits: 1 })}%`}</td>
                  <td>{d === null ? '—' : `${d >= 0 ? '+' : ''}${formatNumber(d, { maximumFractionDigits: 1 })} pt`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        aria-hidden="true"
        className="relative mx-auto w-full max-w-[var(--chart-donut-viewport-max-inline-size)] h-[var(--chart-donut-viewport-block-size)]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* inner = target */}
            <Pie
              data={targetRing}
              dataKey="value"
              nameKey="key"
              innerRadius="44%"
              outerRadius="62%"
              paddingAngle={0}
              startAngle={90}
              endAngle={-270}
              stroke={SEP}
              strokeWidth={1}
              isAnimationActive={false}
            >
              {targetRing.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            {/* outer = actual within each target slot */}
            <Pie
              data={actualRing}
              dataKey="value"
              nameKey="key"
              innerRadius="66%"
              outerRadius="84%"
              paddingAngle={0}
              startAngle={90}
              endAngle={-270}
              stroke={SEP}
              strokeWidth={1}
              isAnimationActive={false}
            >
              {actualRing.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink dark:text-fg">{centerValue}</span>
          <span className="text-[11px] text-fg-tertiary">{centerLabel}</span>
        </div>
      </div>

      {/* Legend = exact numbers (the ring is the visual comparison). Replaces the
          old standalone DriftLedger; one table, no third redundant printing. */}
      <ul className="mt-3 flex flex-col gap-1.5">
        {slots.map((p) => {
          const d = drift(p)
          return (
            <li key={p.label} className="flex items-center gap-2 text-xs text-console-fill dark:text-fg">
              <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              <span className="truncate">{p.label}</span>
              <span className="ml-auto tabular-nums text-fg-tertiary">
                {p.actualPct === null ? '—' : `${formatNumber(p.actualPct, { maximumFractionDigits: 1 })}%`}
                {' · '}
                {formatNumber(p.targetPct, { maximumFractionDigits: 0 })}%
              </span>
              <span
                className={
                  'w-16 shrink-0 text-right tabular-nums ' +
                  (d === null ? 'text-fg-tertiary' : d >= 0 ? 'text-accent-400' : 'text-fg-secondary')
                }
              >
                {d === null ? '—' : `${d >= 0 ? '+' : ''}${formatNumber(d, { maximumFractionDigits: 1 })} pt`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
