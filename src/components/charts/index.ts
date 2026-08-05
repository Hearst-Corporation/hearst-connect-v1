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
 *   mui-x/      composants MUI X Charts (espace, compositions)
 */

/* ── Noyau ────────────────────────────────────────────────────────────────── */
export { ChartFrame, type EtatSerie } from '@/components/charts/core/chart-frame'
export { plottableAsChart } from '@/components/charts/core/chart-theme'

/* ── Cartésiens ───────────────────────────────────────────────────────────── */
export { ProductionMensuelleChart, type MoisProduction } from '@/components/charts/cartesian/btc-production-chart'
export {
  ReserveExpositionChart,
  type PosteBitcoin,
} from '@/components/charts/cartesian/product-charts'

/* ── MUI X ────────────────────────────────────────────────────────────────── */
export { MuiDistributionChart, type DistributionItem } from '@/components/charts/mui-x/distribution-chart'
export { MuiSparkline } from '@/components/charts/mui-x/sparkline'
