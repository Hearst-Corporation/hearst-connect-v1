/**
 * Canonical dataviz boundary (doctrine §7.2).
 *
 * ── What this boundary guarantees ─────────────────────────────────────────
 * The rendering engine does not cross this limit. No route and no business
 * module imports `recharts` — they import a chart from here, which alone
 * decides how it is drawn. That is what makes swapping the engine possible
 * without touching the pages.
 *
 * The rule is enforced by `scripts/check-ui-boundaries.mjs`.
 *
 * ── Organization ──────────────────────────────────────────────────────────
 *   core/       the frame, the states, the theme — what every chart shares
 *   cartesian/  series on x/y axes (BTC production, reserve…)
 *   richart/    Hearst visual library (activity, allocation, curves,
 *               distribution, sparklines) — replaces MUI X Charts
 */

/* ── Core ─────────────────────────────────────────────────────────────────── */
export { ChartFrame, type SeriesState } from '@/components/charts/core/chart-frame'
export { plottableAsChart } from '@/components/charts/core/chart-theme'

/* ── Cartesian ────────────────────────────────────────────────────────────── */
export { ReserveExposureChart, type BitcoinItem } from '@/components/charts/cartesian/product-charts'

/* ── richart ──────────────────────────────────────────────────────────────── */
export { HearstActivityChart, type ActivityPoint } from '@/components/charts/richart/activity-chart'
export { HearstAllocationChart, type AllocationItem } from '@/components/charts/richart/allocation-chart'
export { HearstCurveChart, type CurvePoint } from '@/components/charts/richart/curve-chart'
export {
  RichDistributionChart,
  type DistributionItem,
} from '@/components/charts/richart/distribution-chart'
export { HearstDonutChart, type DonutSlice } from '@/components/charts/richart/donut-chart'
export { RichSparkline } from '@/components/charts/richart/sparkline'
