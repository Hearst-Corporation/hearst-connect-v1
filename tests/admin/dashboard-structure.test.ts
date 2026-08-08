import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural contract — HC-ADMIN-DASHBOARD-WIRING-FIX-009.
 * Canonical surface: `/admin` (legacy `/admin/dashboard` redirects).
 */

const root = (p: string) => resolve(import.meta.dirname, '../../', p)
const PAGE = readFileSync(root('src/app/admin/page.tsx'), 'utf8')
const SOURCE = readFileSync(root('src/features/admin-dashboard/admin-dashboard-page.tsx'), 'utf8')
const HEADER = readFileSync(root('src/components/admin/dashboard/header.tsx'), 'utf8')
const PAGE_HEADER = readFileSync(root('src/components/admin/page-header.tsx'), 'utf8')
const HERO_KPI = readFileSync(root('src/components/admin/hero-kpi.tsx'), 'utf8')
const KPI = readFileSync(root('src/components/admin/dashboard/kpi-grid.tsx'), 'utf8')
const EXPOSURE = readFileSync(root('src/components/admin/dashboard/portfolio-exposure.tsx'), 'utf8')
const REBALANCING = readFileSync(root('src/components/admin/dashboard/rebalancing-panel.tsx'), 'utf8')
const ACTIONS = readFileSync(root('src/components/actions/hearst-actions.tsx'), 'utf8')
const LOAD = readFileSync(root('src/lib/admin-dashboard/load.ts'), 'utf8')

describe('/admin — dashboard structure (WIRING-FIX-009)', () => {
  it('uses Catalyst shell and DashboardHeader', () => {
    expect(SOURCE).toMatch(/<DashboardShell/)
    expect(SOURCE).toMatch(/<DashboardHeader/)
    expect(SOURCE).not.toMatch(/DashboardLightShell/)
    expect(SOURCE).not.toMatch(/bg-fg/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
  })

  it('titles metadata as portfolio oversight', () => {
    expect(PAGE).toMatch(/Portfolio oversight/)
  })

  it('renders four asset-management KPIs in the header bandeau', () => {
    for (const label of ['Total AUM', 'Vaults', 'Deployed capital', 'Maximum drift']) {
      expect(SOURCE).toContain(label)
    }
    expect(SOURCE).toMatch(/<DashboardHeader/)
    expect(SOURCE).toMatch(/kpis=\{kpis\}/)
    expect(SOURCE).not.toMatch(/<DashboardKpiGrid/)
    expect(HEADER).toMatch(/AdminPageHeader/)
    expect(PAGE_HEADER).toMatch(/data-dashboard-kpi-bandeau/)
    expect(KPI).toMatch(/AdminHeroKpiMetrics as DashboardKpiMetrics/)
    expect(HERO_KPI).toMatch(/accent-/)
  })

  it('replaces subscription funnel with portfolio exposure panel', () => {
    expect(SOURCE).not.toMatch(/<SubscriptionJourneyStepper/)
    expect(SOURCE).not.toMatch(/<FunnelColumns/)
    expect(SOURCE).toMatch(/<PortfolioExposurePanel/)
    expect(SOURCE).toContain('Portfolio exposure')
    expect(EXPOSURE).toMatch(/data-widget="portfolio-exposure"/)
  })

  it('replaces priority queue with rebalancing alerts panel', () => {
    expect(SOURCE).not.toMatch(/<ActionQueue/)
    expect(SOURCE).toMatch(/<RebalancingAlertsPanel/)
    expect(SOURCE).toContain('Rebalancing & alerts')
    expect(REBALANCING).toMatch(/data-widget="rebalancing-alerts"/)
  })

  it('loads admin dashboard read models server-side — no registry pilotage math', () => {
    expect(PAGE).not.toMatch(/^'use client'/)
    expect(PAGE).toContain('loadAdminDashboard')
    expect(PAGE).not.toContain('loadAdminRegistry')
    expect(PAGE).not.toContain('buildFunnel')
    expect(SOURCE).toMatch(/AdminDashboardData/)
    expect(SOURCE).not.toMatch(/buildFunnel|buildPriorityQueue|subscriptionsByProduct|movementDailyHeatmap/)
    expect(SOURCE).not.toMatch(/kycStatusBuckets|measuredCount|combine\(/)
    expect(LOAD).toContain('admin-portfolio-overview')
    expect(SOURCE).not.toMatch(/Math\.random\(/)
    expect(SOURCE).not.toMatch(/\.reduce\(/)
  })

  it('mounts asset cockpit cards in preserved grid slots', () => {
    expect(SOURCE).toMatch(/title="Activity"/)
    expect(SOURCE).toMatch(/title="Market"/)
    expect(SOURCE).toMatch(/<VaultsPanel/)
    expect(SOURCE).toMatch(/<RecentClientsPanel/)
    expect(SOURCE).toMatch(/Recent activity/)
    expect(SOURCE).toMatch(/<DataHealthGrid/)
    expect(SOURCE).not.toMatch(/KYC donut|Subscription journey|Subscriptions by product|Latest subscriptions/)
    expect(SOURCE).not.toMatch(/<SourceStatusGrid/)
    expect(SOURCE).not.toMatch(/<HearstDonutChart/)
  })

  it('routes route-level actions through the Hearst actions boundary', () => {
    expect(HEADER).toMatch(/from ['"]@\/components\/actions['"]/)
    expect(ACTIONS).toMatch(/useReducedMotion/)
  })

  it('keeps charts behind the Hearst boundary (recharts only, no MUI X)', () => {
    expect(SOURCE).toMatch(/from ['"]@\/components\/charts['"]/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
    expect(SOURCE).not.toMatch(/from ['"]recharts['"]/)
  })

  // HC-028 P1-2 regression: any dashboard panel that entry-animates with motion.div
  // must gate on `!mounted` so SSR and first client render agree — otherwise
  // prefers-reduced-motion triggers a React hydration mismatch (reproduced in browser).
  it('animated panels guard entry animation with a mounted hydration gate', () => {
    const animatedPanels = [
      'src/components/admin/dashboard/vaults-panel.tsx',
      'src/components/admin/dashboard/rebalancing-panel.tsx',
      'src/components/admin/dashboard/portfolio-exposure.tsx',
    ]
    for (const p of animatedPanels) {
      const src = readFileSync(root(p), 'utf8')
      expect(src, `${p} uses motion`).toMatch(/motion\.div/)
      expect(src, `${p} lacks mounted guard`).toMatch(/!mounted/)
    }
  })
})
