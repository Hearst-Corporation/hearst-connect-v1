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
const ACTIVITY = readFileSync(root('src/components/admin/dashboard/activity-timeline.tsx'), 'utf8')
const VAULTS = readFileSync(root('src/components/admin/dashboard/vaults-panel.tsx'), 'utf8')
const CLIENTS = readFileSync(root('src/components/admin/dashboard/recent-clients-panel.tsx'), 'utf8')
const SHELL = readFileSync(root('src/components/admin/dashboard/shell.tsx'), 'utf8')
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
    expect(EXPOSURE).toMatch(/dashboard-list-slot-block-size/)
  })

  it('replaces priority queue with rebalancing alerts panel', () => {
    expect(SOURCE).not.toMatch(/<ActionQueue/)
    expect(SOURCE).toMatch(/<RebalancingAlertsPanel/)
    expect(SOURCE).toContain('Rebalancing & alerts')
    expect(REBALANCING).toMatch(/data-widget="rebalancing-alerts"/)
    expect(REBALANCING).toMatch(/dashboard-list-slot-block-size/)
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

  it('lays out the dashboard with AdminGrid regions on a shared 12-column ladder', () => {
    expect(SOURCE).toMatch(/from ['"]@\/components\/admin\/grid['"]/)
    expect(SOURCE).toMatch(/<AdminGrid align="stretch">/)
    expect(SOURCE).toMatch(/<AdminGrid>/)
    expect(SOURCE).toMatch(/<AdminCol span=\{7\}/)
    expect(SOURCE).toMatch(/<AdminCol span=\{5\}/)
    expect(SOURCE).toMatch(/className="h-full min-w-0"/)
    expect(SOURCE).toMatch(/<AdminCol span=\{6\}/)
    expect(SOURCE).toMatch(/<AdminCol span=\{3\}/)
    expect(SOURCE).toMatch(/<AdminCol span=\{4\}/)
    expect(SOURCE).not.toMatch(/grid-cols-\[minmax\(0,7fr\)/)
    expect(SOURCE).not.toMatch(/grid-cols-\[minmax\(0,2fr\)/)
    expect(SOURCE).not.toMatch(/@\[52rem\]:grid-cols-3/)
    expect(SOURCE).not.toMatch(/flex flex-wrap/)
    expect(SOURCE).not.toMatch(/flex-\[\d+_1_min\(100%,\d+rem\)\]/)
    expect(SHELL).not.toMatch(/data-footprint=/)
    expect(SHELL).not.toMatch(/dashboard-footprint/)
    expect(SOURCE).not.toMatch(/footprint="/)

    // Tertiary 4+4+4 must not also set md={4}: on the 8-column ladder that
    // fills one row then strands a half-row empty cell next to the third card.
    const tertiarySpanFours = SOURCE.match(/<AdminCol span=\{4\}[^>]*>/g) ?? []
    expect(tertiarySpanFours.length).toBeGreaterThanOrEqual(3)
    for (const col of tertiarySpanFours) {
      expect(col).not.toMatch(/md=\{4\}/)
    }

    for (const t of [
      'Portfolio exposure',
      'Activity',
      'Vaults',
      'Recent activity',
      'Rebalancing & alerts',
      'Market',
      'Recent clients',
      'Data health',
    ]) {
      expect(SOURCE).toContain(t)
    }
  })

  it('keeps dashboard summaries windowed instead of stretching with long datasets', () => {
    expect(ACTIVITY).toMatch(/const MAX_VISIBLE_EVENTS = 5/)
    expect(ACTIVITY).toMatch(/slice\(0, MAX_VISIBLE_EVENTS\)/)
    expect(ACTIVITY).toMatch(/dashboard-list-slot-block-size/)
    expect(ACTIVITY).toContain('View all activity')
    expect(ACTIVITY).not.toMatch(/events\.value\.map\(/)

    expect(REBALANCING).toMatch(/const MAX_VISIBLE_ALERTS = 4/)
    expect(REBALANCING).toMatch(/slice\(0, MAX_VISIBLE_ALERTS\)/)
    expect(REBALANCING).toContain('Open operations')

    expect(VAULTS).toMatch(/const MAX_VISIBLE_VAULTS = 4/)
    expect(VAULTS).toMatch(/slice\(0, MAX_VISIBLE_VAULTS\)/)
    expect(VAULTS).toMatch(/dashboard-list-slot-block-size/)
    expect(VAULTS).toContain('View all vaults')
    expect(VAULTS).not.toMatch(/vaults\.value\.length > 1 \?/)

    expect(CLIENTS).toMatch(/const MAX_VISIBLE_CLIENTS = 3/)
    expect(CLIENTS).toMatch(/slice\(0, MAX_VISIBLE_CLIENTS\)/)
    expect(CLIENTS).toMatch(/dashboard-list-slot-block-size/)
    expect(CLIENTS).toContain('View all clients')
  })

  it('uses one shared dashboard chart viewport for empty and populated activity states', () => {
    expect(SHELL).toMatch(/DASHBOARD_CHART_SLOT_HEIGHT = 176/)
    expect(SHELL).toMatch(/DASHBOARD_CHART_SLOT_CLASS/)
    expect(SOURCE).toMatch(/<HearstActivityChart[\s\S]*height=\{DASHBOARD_CHART_SLOT_HEIGHT\}/)
    expect(SOURCE).toMatch(/<ChartPlaceholder title="Activity" dashboardSlot/)
    expect(SOURCE).toMatch(/DASHBOARD_CHART_SLOT_CLASS/)
    expect(SHELL).toMatch(/dashboard-chart-slot-block-size/)
    expect(SOURCE).not.toMatch(/height=\{140\}/)
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

  it('dashboard panels stay static — no decorative entry motion on server data', () => {
    const staticPanels = [
      'src/components/admin/dashboard/vaults-panel.tsx',
      'src/components/admin/dashboard/rebalancing-panel.tsx',
      'src/components/admin/dashboard/portfolio-exposure.tsx',
      'src/components/admin/dashboard/activity-timeline.tsx',
    ]
    for (const p of staticPanels) {
      const src = readFileSync(root(p), 'utf8')
      expect(src, `${p} must not import motion`).not.toMatch(/from ['"]motion\/react['"]/)
    }
  })
})
