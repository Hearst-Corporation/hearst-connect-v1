'use client'

import { categoricalColor } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * richart — account breakdown donut (allocation, activity mix).
 *
 * A real Recharts part-to-whole ring, behind the charts boundary — never
 * imported from a route. Replaces the stretched HTML `CompositionRail`.
 *
 * ── Two honest kinds, one primitive ───────────────────────────────────────
 *  - `percent` : each value is already a % of the whole. The legend shows the
 *    ONE value; it never repeats it as a "share" (that was the 37.6 % / 37.6 %
 *    duplication). The center reads the REAL measured total, kept to a decimal
 *    so a composition of 99.7 shows 99.7 — never rounded up into a fabricated
 *    100 % that would hide a small idle remainder.
 *  - `count` : each value is a raw count. Here the count and its share of the
 *    total are two different facts, so the legend shows both (`9 · 45%`).
 *
 * ── Geometry ──────────────────────────────────────────────────────────────
 * The ring lives in the shared `donut` viewport (CSS tokens, 220px block). The
 * legend is INTRINSIC — one row per category, never stretched to fill a panel.
 * Slice count changes the legend, never the viewport (chart-viewport contract).
 *
 * ── Color ─────────────────────────────────────────────────────────────────
 * One mint accent for the largest slice, neutral graphite steps for the rest
 * (`categoricalColor`) — never a rainbow, never green-as-success spent on an
 * ordinary bucket. `paddingAngle` separates adjacent arcs without a white stroke.
 */

export type BreakdownSlice = {
  readonly label: string
  readonly value: number
}

export function HearstBreakdownDonut({
  slices,
  kind,
  unit,
  centerCaption,
}: Readonly<{
  slices: readonly BreakdownSlice[]
  /** `percent` → value is already a %; `count` → value is a raw count. */
  kind: 'percent' | 'count'
  /** Legend/center unit word (e.g. "events"). */
  unit: string
  /** Sub-line under the center metric (e.g. "allocated"). Defaults to `unit`. */
  centerCaption?: string
}>) {
  // Largest first, so the mint accent lands on the leading category.
  const ranked = [...slices]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, index) => ({ ...s, fill: categoricalColor(index) }))
  const total = ranked.reduce((sum, s) => sum + s.value, 0)

  // All-zero breakdown: a named absence, never a fabricated "0" over an empty ring.
  if (ranked.length === 0 || total <= 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">Nothing to break down yet.</p>
  }

  const totalText =
    kind === 'percent' ? `${formatNumber(total, { maximumFractionDigits: 1 })}%` : formatNumber(total)
  const caption = centerCaption ?? unit
  const sharePct = (value: number) => formatNumber((value / total) * 100, { maximumFractionDigits: 0 })

  return (
    <div className="w-full">
      <div className="sr-only">
        <table>
          <caption>Breakdown ({unit})</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">{kind === 'percent' ? 'Percent' : unit}</th>
              {kind === 'count' ? <th scope="col">Share</th> : null}
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, index) => (
              <tr key={`${s.label}-${index}`}>
                <th scope="row">{s.label}</th>
                <td>
                  {kind === 'percent'
                    ? `${formatNumber(s.value, { maximumFractionDigits: 1 })}%`
                    : formatNumber(s.value)}
                </td>
                {kind === 'count' ? <td>{sharePct(s.value)}%</td> : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{totalText}</td>
              {kind === 'count' ? <td>100%</td> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        aria-hidden="true"
        className="relative mx-auto w-full max-w-[var(--chart-donut-viewport-max-inline-size)] h-[var(--chart-donut-viewport-block-size)]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ranked}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            />
            <Tooltip content={<BreakdownTooltip kind={kind} unit={unit} total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-fg">{totalText}</span>
          <span className="text-[11px] text-fg-tertiary">{caption}</span>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {ranked.map((s, index) => (
          <li key={`${s.label}-${index}`} className="flex items-center gap-2.5 text-xs text-fg-secondary">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: s.fill }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate" title={s.label}>
              {s.label}
            </span>
            <span className="shrink-0 tabular-nums">
              {kind === 'percent' ? (
                <span className="font-medium text-fg">
                  {formatNumber(s.value, { maximumFractionDigits: 1 })}%
                </span>
              ) : (
                <>
                  <span className="font-medium text-fg">{formatNumber(s.value)}</span>
                  <span className="text-fg-tertiary">
                    {' · '}
                    {sharePct(s.value)}%
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tooltip: label + the honest value for this kind (count adds its share). */
function BreakdownTooltip({
  active,
  payload,
  kind,
  unit,
  total,
}: Readonly<{
  active?: boolean
  payload?: readonly { name?: string; value?: number | null }[]
  kind: 'percent' | 'count'
  unit: string
  total: number
}>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]
  const value = row.value
  if (typeof value !== 'number') return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{row.name ?? ''}</p>
      <p className="mt-0.5 tabular-nums text-fg-tertiary dark:text-fg-secondary">
        {kind === 'percent'
          ? `${formatNumber(value, { maximumFractionDigits: 1 })}%`
          : `${formatNumber(value)} ${unit} · ${formatNumber((value / total) * 100, { maximumFractionDigits: 0 })}%`}
      </p>
    </div>
  )
}
