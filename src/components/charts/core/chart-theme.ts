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
  // Doctrine §7.5: the grid and axes speak the `--chart-*` tokens.
  grid: 'var(--chart-grid, var(--color-fg-tertiary))',
  /** Restrained: grid lines situate a value, they are not part of the data. */
  gridOpacity: 0.06,
  tick: 'var(--chart-axis, var(--color-fg-tertiary))',
  cursor: 'color-mix(in oklab, var(--chart-axis, var(--color-fg-tertiary)) 8%, transparent)',
  tooltip: {
    bg: 'var(--color-white)',
    border: 'color-mix(in oklab, var(--color-ink) 10%, transparent)',
    title: 'var(--color-ink)',
    body: 'var(--color-fg-tertiary)',
  },
  tooltipDark: {
    bg: 'var(--chart-tooltip-surface, var(--color-console-raised))',
    border: 'color-mix(in oklab, var(--color-white) 10%, transparent)',
    title: 'var(--color-fg)',
    body: 'var(--color-fg-secondary)',
  },

  /**
   * Ordinary data. Mint and neutral, nothing else.
   *
   * `brandPrimary` carries the measurement, `dataReference` the thing it is
   * measured against (a target, a cap, a previous period). The contrast
   * between mint and grey is what the reader decodes — not hue against hue.
   */
  dataSeries: {
    brandPrimary: 'var(--color-accent-400)',
    brandSecondary: 'var(--color-accent-700)',
    dataReference: 'var(--chart-neutral, var(--color-fg-tertiary))',
    neutralSurface: 'var(--color-console-raised)',
    neutralRaised: 'var(--color-console-fill-muted)',
  },

  /** Reserved for meaning. Using one of these is a claim about state. */
  semantic: {
    positive: 'var(--chart-positive, var(--color-success-400))',
    warning: 'var(--chart-warning, var(--color-warning-400))',
    critical: 'var(--chart-negative, var(--color-danger-400))',
  },

  /**
   * Compatibility aliases over the two groups above. Kept so existing charts
   * resolve, but every one of them now points at a role: `positive`,
   * `warning` and `negative` are the semantic colors and must only be used
   * where the value genuinely carries that state.
   */
  series: {
    primary: 'var(--color-accent-400)',
    primaryFill: 'var(--color-accent-400)',
    secondary: 'var(--color-accent-700)',
    reference: 'var(--chart-neutral, var(--color-fg-tertiary))',
    tertiary: 'var(--color-console-fill)',
    ghost: 'var(--color-console-fill-muted)',
    positive: 'var(--chart-positive, var(--color-success-400))',
    warning: 'var(--chart-warning, var(--color-warning-400))',
    negative: 'var(--chart-negative, var(--color-danger-400))',
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
// Doctrine §7.5: a SERIES ramp via the `--chart-1..5` tokens (a grammar
// distinct from the status colors). The fallbacks preserve the canonical
// colors when the tokens do not resolve.
const CATEGORICAL_RAMP = [
  'var(--chart-1, var(--color-accent-400))',
  'var(--chart-2, var(--color-fg))',
  'var(--chart-3, var(--color-fg-secondary))',
  'var(--chart-4, var(--color-fg-tertiary))',
  'var(--chart-5, var(--color-console-fill))',
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

/**
 * Semantic viewport roles. Values match CSS tokens in `src/styles/tailwind.css`
 * (`--chart-viewport-*` / `--chart-donut-viewport-block-size`) at 16px root.
 */
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
