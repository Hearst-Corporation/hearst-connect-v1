'use client'

import { categoricalColor, chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { formatNumber } from '@/lib/format'

/**
 * richart — strategy exposure, target vs actual, as concentric absolute rings.
 *
 * ── The question ──────────────────────────────────────────────────────────
 * Where is the vault exposed, what was the target, and where is the drift?
 *
 * ── Why NOT a normalized pie ──────────────────────────────────────────────
 * A pie makes its slices fill 360° — it would turn actuals of 40 + 17.6 + 30
 * (= 87.6, with 12.4 idle) into a full circle, claiming the strategies ARE
 * 100 % of the vault. That is the normalization lie the mission forbids, and a
 * pie cannot represent a null actual nor a total above 100 %. So each strategy
 * is an INDEPENDENT ring on a FIXED 0–100 % angular scale: a full turn is 100 %
 * of the vault, a 40 % arc is literally 40 % of the turn. Nothing is normalized;
 * no remainder is invented; the idle share is simply the unfilled arc.
 *
 * ── The encoding ──────────────────────────────────────────────────────────
 * Per strategy, on its own ring, same category color: a faint full-turn TRACK
 * (the 0–100 context), a SOLID arc for the actual reading, and a bright TICK at
 * the target angle. State is read from ring geometry, never from hue — green and
 * orange stay reserved for meaning. The gap between the solid arc-end and the
 * target tick IS the drift. Honest by construction: a null actual draws no arc
 * (legend "—"); a genuine 0 % draws no arc either (butt caps, gated on > 0), so
 * zero exposure is never a fabricated dot; a negative reading is floored at 0 so
 * a bad datum can never become a full solid ring; an actual above 100 % caps at
 * one full turn while the legend keeps the exact number.
 *
 * Hand-drawn SVG (a radial gauge is the honest "radial solution" the pie can't
 * be) — still behind the charts boundary, never imported from a route.
 */

export type ExposureItem = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}

type Row = ExposureItem & { readonly fill: string; readonly drift: number | null }

// Ring geometry, in a 0..100 viewBox square centered on (50,50).
const CENTER = 50
const R_OUTER = 46
const R_INNER = 21 // leaves a center hole for the metric
const RING_GAP = 2.6
// Track sits OFF the categorical ramp (categoricalColor(4) is console-fill), so a
// 5th strategy's arc never collides with its own background track.
const TRACK = chartTheme.dataSeries.neutralRaised

/** Point on a circle; 0 % sits at 12 o'clock, values sweep clockwise. */
function polar(radius: number, pct: number): { x: number; y: number } {
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180)
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) }
}

export function HearstExposureRadial({ items }: Readonly<{ items: readonly ExposureItem[] }>) {
  const rows: Row[] = items.map((p, index) => ({
    ...p,
    fill: categoricalColor(index),
    drift: p.actualPct !== null ? p.actualPct - p.targetPct : null,
  }))

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No pockets to plot yet.</p>
  }

  // Worst absolute drift — the figure that decides rebalancing (sign-only, no
  // threshold). Null when no pocket has an actual reading.
  const worst = rows.reduce<{ label: string; d: number } | null>((acc, r) => {
    if (r.drift === null) return acc
    const best = acc === null ? -1 : Math.abs(acc.d)
    return Math.abs(r.drift) > best ? { label: r.label, d: r.drift } : acc
  }, null)

  // One ring per strategy, outermost first. Each band gets an equal share of the
  // radial span; thickness is the band minus a gap.
  const band = (R_OUTER - R_INNER) / rows.length
  const thickness = Math.max(3, band - RING_GAP)
  const geom = rows.map((r, index) => {
    const radius = R_OUTER - band * (index + 0.5)
    const circumference = 2 * Math.PI * radius
    // Absolute scale: a full turn is 100 %. Floor at 0 (a bad negative datum can
    // never become a full ring) and cap at 100 (over-allocation shows a full turn;
    // the legend keeps the exact number — the chart never fakes a share).
    const actualFrac = r.actualPct === null ? null : Math.max(0, Math.min(r.actualPct, 100)) / 100
    const targetTick = Math.min(Math.max(r.targetPct, 0), 100)
    const tickInner = polar(radius - thickness / 2 - 1, targetTick)
    const tickOuter = polar(radius + thickness / 2 + 1, targetTick)
    return { ...r, radius, circumference, actualFrac, tickInner, tickOuter }
  })

  return (
    <div className="w-full">
      <ChartAccessibilityTable
        caption="Target and actual allocation per strategy, in percent of vault"
        columns={['Strategy', 'Target', 'Actual', 'Drift']}
        rows={rows.map((r, index) => ({
          key: `${r.label}-${index}`,
          label: r.label,
          cells: [
            `${formatNumber(r.targetPct, { maximumFractionDigits: 1 })}%`,
            r.actualPct === null ? 'not read' : `${formatNumber(r.actualPct, { maximumFractionDigits: 1 })}%`,
            r.drift === null
              ? 'not read'
              : `${r.drift >= 0 ? '+' : ''}${formatNumber(r.drift, { maximumFractionDigits: 1 })} pt`,
          ],
        }))}
      />

      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        <div className="relative h-[var(--chart-donut-viewport-block-size)] w-[var(--chart-donut-viewport-block-size)] max-w-full shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
            {geom.map((g, index) => (
              <g key={`${g.label}-${index}`}>
                {/* 0–100 track — the absolute-scale context. */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={g.radius}
                  fill="none"
                  stroke={TRACK}
                  strokeWidth={thickness}
                />
                {/* Actual — solid arc from 12 o'clock, clockwise. Butt caps so the
                    arc length is EXACTLY actualFrac of the turn (no round-cap
                    overhang); gated on > 0 so a genuine 0 % paints nothing. */}
                {g.actualFrac !== null && g.actualFrac > 0 ? (
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={g.radius}
                    fill="none"
                    stroke={g.fill}
                    strokeWidth={thickness}
                    strokeLinecap="butt"
                    strokeDasharray={`${g.actualFrac * g.circumference} ${g.circumference}`}
                    transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  >
                    <title>{`${g.label} — actual ${formatNumber(g.actualPct as number, { maximumFractionDigits: 1 })}%`}</title>
                  </circle>
                ) : null}
                {/* Target — a bright neutral tick across the ring at the target
                    angle. Neutral (not the category hue) so the "target here"
                    marker reads on every ring, even the faint neutral ones. */}
                <line
                  x1={g.tickInner.x}
                  y1={g.tickInner.y}
                  x2={g.tickOuter.x}
                  y2={g.tickOuter.y}
                  stroke="var(--color-fg)"
                  strokeOpacity={0.9}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {worst !== null ? (
              <>
                <span
                  className={`text-2xl font-semibold tabular-nums ${worst.d >= 0 ? 'text-accent-400' : 'text-fg'}`}
                >
                  {worst.d >= 0 ? '+' : ''}
                  {formatNumber(worst.d, { maximumFractionDigits: 1 })}
                </span>
                <span className="text-[11px] text-fg-tertiary">worst drift · pt</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold text-fg-tertiary">—</span>
                <span className="text-[11px] text-fg-tertiary">actual unread</span>
              </>
            )}
          </div>
        </div>

        {/* Legend = exact numbers (the rings are the visual comparison). */}
        <div className="min-w-[15rem] flex-1">
          <p className="mb-2 text-[11px] text-fg-tertiary">Solid arc actual · tick target · gap is the drift</p>
          <ul className="flex flex-col gap-1.5">
            {rows.map((r, index) => (
              <li key={`${r.label}-${index}`} className="flex items-center gap-2.5 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: r.fill }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-fg-secondary" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 tabular-nums text-fg-tertiary">
                  A {r.actualPct === null ? '—' : formatNumber(r.actualPct, { maximumFractionDigits: 1 })} ·
                  T {formatNumber(r.targetPct, { maximumFractionDigits: 1 })}
                </span>
                <span
                  className={`w-16 shrink-0 text-right tabular-nums ${
                    r.drift === null ? 'text-fg-tertiary' : r.drift >= 0 ? 'text-accent-400' : 'text-fg-secondary'
                  }`}
                >
                  {r.drift === null
                    ? '—'
                    : `${r.drift >= 0 ? '+' : ''}${formatNumber(r.drift, { maximumFractionDigits: 1 })} pt`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
