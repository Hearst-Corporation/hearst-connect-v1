/**
 * Chart tokens — one Hearst palette, with roles.
 *
 * ── The rule the rejected version broke ───────────────────────────────────
 * Bright green for one ordinary dataset and orange for another is not a
 * palette, it is two alarms going off about nothing. Green and orange mean
 * something in this product: healthy, and worth watching. Spending them on
 * "pocket S0" and "pocket S1" leaves nothing to say with when a pocket is
 * genuinely off target.
 *
 * So the palette splits in two, and the split is enforced by naming:
 *
 *   `dataSeries`   — ordinary data. Mint ramp and neutrals ONLY. Never
 *                    green-as-success, never orange, never red.
 *   `semantic`     — reserved for meaning: positive / warning / critical.
 *                    A chart may use these, but only to say what they mean.
 *
 * ── Viewport ──────────────────────────────────────────────────────────────
 * The chart viewport owns chart geometry. Data draws inside it.
 * Dataset size does NOT choose the external height.
 *
 * Roles (from real consumers — not page names, not pixel names):
 *   compact  — admin bento / dense panels
 *   standard — default ChartFrame + vault/product charts
 *   hero     — account central analysis region
 *   donut    — categorical donut (aligned with CSS tokens)
 *
 * Sparklines are a separate component-level constant (`CHART_SPARK_VIEWPORT_PX`).
 */

import { formatNumber } from '@/lib/format'

export const chartTheme = {
  /* Live height flows through `chartViewport(role)` — not dataset length. */
  margin: { top: 8, right: 16, bottom: 8, left: 8 },
  axisFontSize: 11,
  grid: 'var(--ds-shell-subtle)',
  /** Restrained: grid lines situate a value, they are not part of the data. */
  gridOpacity: 0.06,
  tick: 'var(--ds-shell-subtle)',
  cursor: 'color-mix(in oklab, var(--ds-shell-subtle) 8%, transparent)',
  /** Surface under the plot — the active-dot ring "cuts" the dot out of the line. */
  plotSurface: 'var(--ds-surface)',

  /**
   * Ordinary data. Mint and neutral, nothing else.
   *
   * `brandPrimary` carries the measurement, `dataReference` the thing it is
   * measured against (a target, a cap, a previous period). The contrast
   * between mint and grey is what the reader decodes — not hue against hue.
   */
  dataSeries: {
    brandPrimary: 'var(--ds-accent)',
    brandSecondary: 'var(--ds-accent-deep)',
    dataReference: 'var(--ds-shell-subtle)',
    neutralSurface: 'var(--ds-surface-raised)',
    neutralRaised: 'var(--ds-surface-sunken)',
  },

  /** Reserved for meaning. Using one of these is a claim about state. */
  semantic: {
    positive: 'var(--ds-success)',
    warning: 'var(--ds-warning)',
    critical: 'var(--ds-danger)',
  },
} as const

/**
 * A categorical ramp for N ordinary series.
 *
 * The approved system spends green as an ACCENT, not as a palette: its own
 * reference chart draws the leading bar in `--accent` and every other bar in
 * neutral grey. So does this ramp — the first (largest, since these charts
 * sort descending) category carries the mint, and the rest step down through
 * neutral graphite. A six-category chart therefore has one green bar, not six
 * shades of green pretending to be six different meanings.
 */
const CATEGORICAL_RAMP = [
  'var(--ds-accent)',
  'var(--ds-text-subtle)',
  'var(--ds-shell-subtle)',
  'var(--ds-chart-4)',
  'var(--ds-surface-sunken)',
] as const

export function categoricalColor(index: number): string {
  return CATEGORICAL_RAMP[index % CATEGORICAL_RAMP.length] ?? CATEGORICAL_RAMP[0]
}

/* ── Viewport ─────────────────────────────────────────────────────────────── */

export type ChartKind =
  /** Horizontal bars — categories draw inside a fixed viewport. */
  | 'rows'
  /** Vertical bars over an ordered axis. */
  | 'columns'
  /** Continuous series. */
  | 'line'
  /** Categorical donut — fixed square-ish viewport; slice count does not resize. */
  | 'donut'

/** Semantic viewport roles, in px. */
export type ChartViewportRole = 'compact' | 'standard' | 'hero' | 'donut'

export const CHART_VIEWPORT_PX = {
  compact: 176,
  standard: 240,
  hero: 340,
  donut: 220,
} as const satisfies Record<ChartViewportRole, number>

/** Account KPI sparkline default — component-level, not a page role. */
export const CHART_SPARK_VIEWPORT_PX = 28 as const

export function chartViewport(role: ChartViewportRole): number {
  return CHART_VIEWPORT_PX[role]
}

export function defaultViewportForKind(kind: ChartKind): ChartViewportRole {
  switch (kind) {
    case 'donut':
      return 'donut'
    case 'rows':
    case 'columns':
    case 'line':
      return 'standard'
  }
}

/**
 * Resolve the owned viewport for a chart instance.
 * Explicit `height` wins (escape hatch); else `viewport` role; else kind default.
 * Dataset length is never an input.
 */
export function resolveChartViewport(opts: {
  readonly height?: number
  readonly viewport?: ChartViewportRole
  readonly kind?: ChartKind
}): number {
  if (opts.height != null) return opts.height
  if (opts.viewport != null) return chartViewport(opts.viewport)
  if (opts.kind != null) return chartViewport(defaultViewportForKind(opts.kind))
  return chartViewport('standard')
}

/**
 * @deprecated Prefer `chartViewport(role)` or `resolveChartViewport`.
 * Kept as a thin adapter: `points` is ignored — dataset size must not own geometry.
 */
export function chartHeight(kind: ChartKind, _points?: number): number {
  return chartViewport(defaultViewportForKind(kind))
}

/**
 * Whether the chart slot should render (axes + canvas), even when the series
 * is short or empty. A placeholder stays visible so the layout never collapses
 * to a text-only absence where a chart is expected.
 */
export function plottableAsChart(_points: number): boolean {
  return true
}

/**
 * Shared percent formatter for chart adapters (sr-only tables, tooltips,
 * axis labels). `null` reads as "not read" (`—`), never `0 %` — a chart
 * adapter never invents the value it was not handed. Deliberately not
 * `formatPercent` from `lib/format.ts`: that one has no space before `%`
 * and defaults to 1 decimal — chart adapters use a space and 2 decimals,
 * so this wraps `formatNumber` with the chart-specific literal instead.
 */
export function formatChartPercent(value: number | null): string {
  if (value === null) return '—'
  return `${formatNumber(value, { maximumFractionDigits: 2 })} %`
}
