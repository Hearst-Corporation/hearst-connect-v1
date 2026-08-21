/**
 * Canonical dataviz boundary (doctrine §7.2).
 *
 * ── What this boundary guarantees ─────────────────────────────────────────
 * The rendering engine does not cross this limit. No route and no business
 * module imports `recharts` — they import a chart from here, which alone
 * decides how it is drawn. That is what makes swapping the engine possible
 * without touching the pages.
 *
 * ── Organization ──────────────────────────────────────────────────────────
 *   core/       the frame, the states, the theme — what every chart shares
 *   cartesian/  series on x/y axes (BTC production, reserve…)
 *   richart/    Hearst visual library (activity, allocation, curves,
 *               distribution, sparklines) — replaces MUI X Charts
 */

/* ── Core ─────────────────────────────────────────────────────────────────── */
/* Viewport helpers (`resolveChartViewport`, `chartViewport`, …) stay in
   `core/chart-theme` — chart internals and tests import them there directly. */
export { ChartFrame, type SeriesState } from '@/components/charts/core/chart-frame'

/* ── Cartesian ────────────────────────────────────────────────────────────── */
export { ReserveExposureChart, type BitcoinItem } from '@/components/charts/cartesian/product-charts'

/* ── richart ──────────────────────────────────────────────────────────────── */
export { HearstActivityChart, type ActivityPoint } from '@/components/charts/richart/activity-chart'
export { HearstAllocationChart, type AllocationItem } from '@/components/charts/richart/allocation-chart'
export { HearstBreakdownDonut } from '@/components/charts/richart/breakdown-donut'
export { HearstCurveChart } from '@/components/charts/richart/curve-chart'
export { HearstExposureRadial } from '@/components/charts/richart/exposure-radial'
export {
  RichDistributionChart,
  type DistributionItem,
} from '@/components/charts/richart/distribution-chart'
export { HearstDonutChart, type DonutSlice } from '@/components/charts/richart/donut-chart'
export { HearstLineChart, type LinePoint } from '@/components/charts/richart/line-chart'
export { SignedBarChart } from '@/components/charts/richart/signed-bar-chart'
export { RichSparkline } from '@/components/charts/richart/sparkline'
export { VaultAumCbbtcChart } from '@/components/charts/richart/vault-aum-cbbtc-chart'
export {
  AllocationDualLineChart,
  type AllocationPoint,
} from '@/components/charts/richart/allocation-dual-line-chart'
export { BucketSparklines } from '@/components/charts/richart/bucket-sparklines'
