/**
 * Frontière canonique de la dataviz (doctrine §7.2).
 *
 * ── Ce que cette frontière garantit ───────────────────────────────────────
 * Le moteur de rendu ne franchit pas cette limite. Aucune route, aucun module
 * métier n'importe `recharts` — ils importent un chart d'ici, qui décide seul
 * de comment il est dessiné. C'est ce qui rend un changement de moteur
 * possible sans toucher aux pages.
 *
 * La règle est vérifiée par `scripts/check-ui-boundaries.mjs`.
 *
 * ── Organisation ──────────────────────────────────────────────────────────
 *   core/       le cadre, les états, le thème — ce que tout chart partage
 *   cartesian/  séries sur des axes x/y (production BTC, réserve…)
 *   richart/    bibliothèque visuelle Hearst (activité, allocation, courbes,
 *               distribution, sparklines) — remplace MUI X Charts
 */

/* ── Noyau ────────────────────────────────────────────────────────────────── */
export { ChartFrame, type SeriesState, type EtatSerie } from '@/components/charts/core/chart-frame'
export { plottableAsChart } from '@/components/charts/core/chart-theme'

/* ── Cartésiens ───────────────────────────────────────────────────────────── */
export { ProductionMensuelleChart, type MoisProduction } from '@/components/charts/cartesian/btc-production-chart'
export { ReserveExpositionChart, type PosteBitcoin } from '@/components/charts/cartesian/product-charts'

/* ── richart ──────────────────────────────────────────────────────────────── */
export { HearstActivityChart, type PointActivite } from '@/components/charts/richart/activity-chart'
export { HearstAllocationChart, type PosteAllocation } from '@/components/charts/richart/allocation-chart'
export { HearstCourbeChart, type PointCourbe } from '@/components/charts/richart/courbe-chart'
export {
  RichDistributionChart,
  MuiDistributionChart,
  type DistributionItem,
} from '@/components/charts/richart/distribution-chart'
export { HearstDonutChart, type DonutSlice } from '@/components/charts/richart/donut-chart'
export { RichSparkline } from '@/components/charts/richart/sparkline'
