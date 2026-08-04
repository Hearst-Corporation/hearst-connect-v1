/**
 * Frontière canonique de la dataviz (doctrine §7.2).
 *
 * ── Ce que cette frontière garantit ───────────────────────────────────────
 * Le moteur de rendu ne franchit pas cette limite. Aucune route, aucun module
 * métier n'importe `recharts` — ni, plus tard, un autre moteur : ils importent
 * un chart d'ici, qui décide seul de comment il est dessiné. C'est ce qui rend
 * un changement de moteur possible sans toucher aux pages.
 *
 * La règle est vérifiée par `scripts/check-ui-boundaries.mjs`, pas seulement
 * documentée ici.
 *
 * ── Organisation ──────────────────────────────────────────────────────────
 *   core/       le cadre, les états, le thème — ce que tout chart partage
 *   cartesian/  séries sur des axes x/y
 *   polar/      répartitions angulaires
 *
 * Recharts est le moteur standard actif. MUI X Charts n'est pas introduit :
 * aucun composant existant ne l'utilise, et la doctrine interdit d'ajouter une
 * seconde bibliothèque sans besoin démontré.
 */

/* ── Noyau ────────────────────────────────────────────────────────────────── */
export { ChartFrame, type EtatSerie } from '@/components/charts/core/chart-frame'
export { GreenHeroChartPanel } from '@/components/charts/core/hero-chart-panel'
export {
  categoricalColor,
  chartHeight,
  chartTheme,
  plottableAsChart,
  type ChartKind,
} from '@/components/charts/core/chart-theme'

/* ── Cartésiens ───────────────────────────────────────────────────────────── */
export { ProductionMensuelleChart, type MoisProduction } from '@/components/charts/cartesian/btc-production-chart'
export { MiningProductionChart, type MoisProduit } from '@/components/charts/cartesian/mining-production-chart'
export { DerivePochesChart, type DerivePoche } from '@/components/charts/cartesian/derive-poches-chart'
export {
  ReserveExpositionChart,
  VendingCurveChart,
  type PointCourbe,
  type PosteBitcoin,
} from '@/components/charts/cartesian/product-charts'

/* ── Polaires ─────────────────────────────────────────────────────────────── */
export { AllocationChart, type PocheAllocation } from '@/components/charts/polar/allocation-chart'
export { DistributionBarChart, type BarreRepartition } from '@/components/charts/polar/distribution-chart'
