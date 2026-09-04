'use client'

import { categoricalColor, chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { formatNumber } from '@/lib/format'
import { useState } from 'react'

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

/**
 * Coordonnées arrondies au millième d'unité de viewBox.
 *
 * `Math.cos`/`Math.sin` ne sont pas garantis identiques au dernier bit d'un
 * moteur JS à l'autre — la spec les laisse libres. Node et le navigateur
 * pouvaient donc produire `82.74465961097238` contre `...236`, ce que React
 * signalait comme une erreur d'hydratation. Trois décimales sur un viewBox de
 * cette taille sont très en deçà du pixel : rien ne bouge à l'écran.
 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Point on a circle; 0 % sits at 12 o'clock, values sweep clockwise. */
function polar(radius: number, pct: number): { x: number; y: number } {
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180)
  return {
    x: round3(CENTER + radius * Math.cos(angle)),
    y: round3(CENTER + radius * Math.sin(angle)),
  }
}

export function HearstExposureRadial({
  items,
  aumUsdc = null,
  briefs = null,
}: Readonly<{
  items: readonly ExposureItem[]
  /** AUM du vault : chiffre chaque poche en dollars. Sans lui, la légende
   *  retombe sur le pourcentage réel — jamais sur un montant inventé. */
  aumUsdc?: number | null
  /** Une ligne par poche, indexée sur le libellé. Éditorial, pas lu d'une
   *  source : une poche absente de la table n'affiche pas de description. */
  briefs?: Readonly<Record<string, string>> | null
}>) {
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
    const circumference = round3(2 * Math.PI * radius)
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

      <div className="flex flex-wrap items-center gap-x-7 gap-y-6">
        <div className="relative aspect-square w-[16rem] min-w-[12rem] max-w-full flex-[0_1_auto]">
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
                    strokeDasharray={`${round3(g.actualFrac * g.circumference)} ${g.circumference}`}
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
        <div className="min-w-[20rem] flex-[1_1_32rem]">
          <p className="mb-4 text-[11px] text-fg-tertiary">
            Share of vault · value · drift from target
          </p>
          <ul className="flex flex-col gap-6">
            {rows.map((r, index) => (
              <PocketRow
                key={`${r.label}-${index}`}
                row={r}
                aumUsdc={aumUsdc}
                brief={briefs?.[r.label]}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}


/**
 * Une poche de la légende, dépliable.
 *
 * Une seule grille pour toute la ligne — libellé, montant, dérive, action — et
 * le détail réutilise ses pistes plutôt que d'ouvrir une indentation de plus.
 * Les colonnes de valeurs ont une largeur fixe : sans elle les montants dansent
 * d'une ligne à l'autre.
 *
 * Le détail ne charge rien : cible, réel et dérive sont déjà dans la ligne. Il
 * les met en toutes lettres, là où la ligne repliée n'affiche que la dérive.
 */
function PocketRow({
  row,
  aumUsdc,
  brief,
}: Readonly<{ row: Row; aumUsdc: number | null; brief: string | undefined }>) {
  const [open, setOpen] = useState(false)

  const amount =
    row.actualPct === null
      ? '—'
      : aumUsdc !== null
        ? `$${formatNumber((row.actualPct / 100) * aumUsdc, { maximumFractionDigits: 0 })}`
        : `${formatNumber(row.actualPct, { maximumFractionDigits: 1 })} %`

  const driftText =
    row.drift === null
      ? '—'
      : `${row.drift >= 0 ? '+' : ''}${formatNumber(row.drift, { maximumFractionDigits: 1 })} pt`

  const driftClass =
    row.drift === null ? 'text-fg-tertiary' : row.drift >= 0 ? 'text-accent-400' : 'text-fg-secondary'

  return (
    <li className="grid grid-cols-[auto_9rem_minmax(3rem,1fr)_3.25rem_6.5rem_3.5rem_auto] items-baseline gap-x-4 gap-y-1.5 text-xs">
      <span
        className="size-2.5 translate-y-[1px] rounded-[3px]"
        style={{ background: row.fill }}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate text-fg-secondary" title={row.label}>
        {row.label}
      </span>
      {/* Poids de la poche dans le vault. L'échelle est absolue (0–100 % du
          fonds), comme les anneaux : une barre pleine dirait « tout le vault »,
          jamais « la plus grosse des trois ». */}
      <span className="h-1.5 self-center overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${row.actualPct === null ? 0 : Math.min(Math.max(row.actualPct, 0), 100)}%`,
            background: row.fill,
          }}
        />
      </span>
      <span className="text-right tabular-nums text-fg-tertiary">
        {row.actualPct === null
          ? '—'
          : `${formatNumber(row.actualPct, { maximumFractionDigits: 1 })} %`}
      </span>

      <span className="text-right tabular-nums text-fg-secondary">{amount}</span>
      <span className={`text-right tabular-nums ${driftClass}`}>{driftText}</span>
      {/* Mêmes tokens que le bouton « Detail » des mouvements : `bg-accent-400`
          (#a7fb90) et `text-accent-ink` (#000) divergeaient de `--hearst-green`
          (#9eea7a) et `--hearst-green-ink` (#06140a). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ud-detail-btn"
      >
        {open ? 'Hide' : 'Detail'}
      </button>

      {/* Description et détail restent dans la grille, alignés sur le libellé —
          pas d'indentation supplémentaire qui créerait un troisième niveau. La
          description n'apparaît qu'au dépli : repliée, la ligne se lit d'un coup
          d'œil et les trois poches tiennent sur trois lignes. */}
      {open ? (
        <span className="col-start-2 -col-end-1 flex flex-col gap-1.5 text-[11px] text-fg-tertiary">
          {brief !== undefined ? <span className="leading-snug">{brief}</span> : null}
          <span className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Target{' '}
            <span className="tabular-nums text-fg-secondary">
              {formatNumber(row.targetPct, { maximumFractionDigits: 1 })} %
            </span>
          </span>
          <span>
            Actual{' '}
            <span className="tabular-nums text-fg-secondary">
              {row.actualPct === null
                ? 'not read'
                : `${formatNumber(row.actualPct, { maximumFractionDigits: 1 })} %`}
            </span>
          </span>
          <span>
            Drift <span className={`tabular-nums ${driftClass}`}>{driftText}</span>
          </span>
          </span>
        </span>
      ) : null}
    </li>
  )
}
