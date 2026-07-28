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
 * ── Height ────────────────────────────────────────────────────────────────
 * One global fixed height is what produced a single bar floating in a 320px
 * plot. `chartHeight` derives a height from the chart type and the number of
 * observations instead; a chart is never taller than its information value.
 */

export const chartTheme = {
  /**
   * Legacy class-based heights. Prefer `chartHeight()` — these remain for
   * frames whose content genuinely is a fixed-size block (gauges, meters).
   */
  height: {
    small: 'h-[180px]',
    medium: 'h-[220px]',
    large: 'h-[280px]',
  },
  margin: { top: 8, right: 16, bottom: 8, left: 8 },
  axisFontSize: 11,
  grid: 'var(--color-zinc-500)',
  /** Restrained: grid lines situate a value, they are not part of the data. */
  gridOpacity: 0.06,
  tick: 'var(--color-zinc-500)',
  cursor: 'color-mix(in oklab, var(--color-zinc-500) 8%, transparent)',
  tooltip: {
    bg: 'var(--color-white)',
    border: 'color-mix(in oklab, var(--color-zinc-950) 10%, transparent)',
    title: 'var(--color-zinc-950)',
    body: 'var(--color-zinc-500)',
  },
  tooltipDark: {
    bg: 'var(--color-zinc-800)',
    border: 'color-mix(in oklab, var(--color-white) 10%, transparent)',
    title: 'var(--color-white)',
    body: 'var(--color-zinc-400)',
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
    dataReference: 'var(--color-zinc-500)',
    neutralSurface: 'var(--color-zinc-800)',
    neutralRaised: 'var(--color-zinc-700)',
  },

  /** Reserved for meaning. Using one of these is a claim about state. */
  semantic: {
    positive: 'var(--color-success-400)',
    warning: 'var(--color-warning-400)',
    critical: 'var(--color-danger-400)',
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
    reference: 'var(--color-zinc-500)',
    tertiary: 'var(--color-zinc-600)',
    ghost: 'var(--color-zinc-700)',
    positive: 'var(--color-success-400)',
    warning: 'var(--color-warning-400)',
    negative: 'var(--color-danger-400)',
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
export const CATEGORICAL_RAMP = [
  'var(--color-accent-400)',
  'var(--color-zinc-300)',
  'var(--color-zinc-400)',
  'var(--color-zinc-500)',
  'var(--color-zinc-600)',
  'var(--color-zinc-700)',
] as const

export function categoricalColor(index: number): string {
  return CATEGORICAL_RAMP[index % CATEGORICAL_RAMP.length] ?? CATEGORICAL_RAMP[0]
}

/* ── Height ───────────────────────────────────────────────────────────────── */

export type ChartKind =
  /** Horizontal bars — one row per category; height grows with the row count. */
  | 'rows'
  /** Vertical bars over an ordered axis. */
  | 'columns'
  /** Continuous series. */
  | 'line'

/** Row height and chrome for a horizontal bar chart, in px. */
const ROW_HEIGHT = 44
const ROW_CHROME = 48

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * The height a chart is entitled to, in pixels.
 *
 * Derived from what is actually plotted: three rows do not need the same
 * canvas as twelve, and one observation needs no canvas at all — the caller
 * should render `SingleObservation` instead of a chart in that case.
 */
export function chartHeight(kind: ChartKind, points: number): number {
  if (points <= 0) return 140

  switch (kind) {
    case 'rows':
      return clamp(points * ROW_HEIGHT + ROW_CHROME, 132, 420)
    case 'columns':
      if (points <= 3) return 180
      if (points <= 6) return 210
      if (points <= 12) return 240
      return 280
    case 'line':
      if (points <= 6) return 200
      if (points <= 24) return 240
      return 280
  }
}

/**
 * A series can only be plotted as a trend once it has enough ordered
 * observations to show one. Below that, the honest rendering is the value
 * itself — see `SingleObservation`.
 */
export const MIN_POINTS_FOR_CHART = 2

export function plottableAsChart(points: number): boolean {
  return points >= MIN_POINTS_FOR_CHART
}
