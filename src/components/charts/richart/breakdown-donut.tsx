'use client'

import { CHART_VIEWPORT_PX, categoricalColor } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { formatNumber } from '@/lib/format'
import { Pie, PieChart, Tooltip } from 'recharts'

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
 *  - `usd` : each value is a dollar amount. Same as `count`, written in
 *    compact dollars (`$12.0M · 54%`) — capital by client type, by client…
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

export type BreakdownKind = 'percent' | 'count' | 'usd' | 'btc'

/** Dollars compacts : « $12.0M », « $850K ». */
function usdCompact(value: number): string {
  return `$${formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 })}`
}

/** La valeur d'une part, écrite selon son genre. */
function valueText(kind: BreakdownKind, value: number): string {
  if (kind === 'percent') return `${formatNumber(value, { maximumFractionDigits: 1 })}%`
  if (kind === 'usd') return usdCompact(value)
  if (kind === 'btc') return `${formatNumber(value, { maximumFractionDigits: value >= 100 ? 0 : 1 })} BTC`
  return formatNumber(value)
}

export type BreakdownSlice = {
  readonly label: string
  readonly value: number
}

/** Same fixed donut viewport as `donut-chart` (220px block, 260px max inline). */
const DONUT_MAX_INLINE_PX = 260
const DONUT_BLOCK_PX = CHART_VIEWPORT_PX.donut

export function HearstBreakdownDonut({
  slices,
  kind,
  unit,
  centerCaption,
  layout = 'stacked',
}: Readonly<{
  slices: readonly BreakdownSlice[]
  /** `percent` → value is already a %; `count` → raw count; `usd` → dollars. */
  kind: BreakdownKind
  /** Legend/center unit word (e.g. "events"). */
  unit: string
  /** Sub-line under the center metric (e.g. "allocated"). Defaults to `unit`. */
  centerCaption?: string
  /** `side` : l'anneau à gauche, la légende à droite — un bloc moins haut,
   *  pour une carte posée à côté d'un bandeau de chiffres. */
  layout?: 'stacked' | 'side'
}>) {
  // Hooks before any early return (rules-of-hooks).
  const { ref, width } = useChartWidth()

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

  const totalText = valueText(kind, total)
  const caption = centerCaption ?? unit
  /* Côte à côte, l'anneau rétrécit pour laisser la légende lisible en entier. */
  const blockPx = layout === 'side' ? 164 : DONUT_BLOCK_PX
  const sharePct = (value: number) => formatNumber((value / total) * 100, { maximumFractionDigits: 0 })

  return (
    <div className={layout === 'side' ? 'donut-side flex w-full flex-col items-center gap-5 sm:flex-row' : 'w-full'}>
      <ChartAccessibilityTable
        caption={`Breakdown (${unit})`}
        columns={
          kind === 'percent' ? ['Category', 'Percent'] : ['Category', unit, 'Share']
        }
        rows={ranked.map((s, index) => ({
          key: `${s.label}-${index}`,
          label: s.label,
          cells:
            kind === 'percent'
              ? [valueText(kind, s.value)]
              : [valueText(kind, s.value), `${sharePct(s.value)}%`],
        }))}
        footer={{
          label: 'Total',
          cells: kind === 'percent' ? [totalText] : [totalText, '100%'],
        }}
      />

      <div
        ref={ref}
        aria-hidden="true"
        className={layout === 'side' ? 'relative w-[164px] shrink-0' : 'relative mx-auto w-full'}
        style={{ maxWidth: DONUT_MAX_INLINE_PX, height: blockPx }}
        data-chart-viewport={blockPx}
      >
        {width > 0 ? (
          <PieChart width={width} height={blockPx}>
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
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-fg">{totalText}</span>
          <span className="text-[11px] text-fg-tertiary">{caption}</span>
        </div>
      </div>

      <ul className={layout === 'side' ? 'flex w-full min-w-0 flex-1 flex-col gap-2' : 'mt-5 flex flex-col gap-1.5'}>
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
                  <span className="font-medium text-fg">{valueText(kind, s.value)}</span>
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
  kind: BreakdownKind
  unit: string
  total: number
}>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]
  const value = row.value
  if (typeof value !== 'number') return null
  return (
    <ChartTooltipShell title={row.name ?? ''}>
      <TooltipRow
        first
        value={
          kind === 'percent'
            ? `${formatNumber(value, { maximumFractionDigits: 1 })}%`
            : `${valueText(kind, value)}${kind === 'usd' ? '' : ` ${unit}`} · ${formatNumber((value / total) * 100, { maximumFractionDigits: 0 })}%`
        }
      />
    </ChartTooltipShell>
  )
}
