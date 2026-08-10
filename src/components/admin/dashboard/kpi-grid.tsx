/**
 * Dashboard compat shim — the hero KPIs live in `admin/hero-kpi`.
 * This module keeps the legacy name imported by the barrel and the tests.
 */
export {
  AdminHeroKpiMetrics as DashboardKpiMetrics,
  type AdminHeroKpi as DashboardKpi,
} from '@/components/admin/hero-kpi'
