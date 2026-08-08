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

  // HC-ADMIN-BENTO — intrinsic bento, tile size follows the DATA WEIGHT.
  //
  // Every panel is a bento tile in a single `flex-wrap` container. Each tile's
  // `flex-basis` encodes the measured richness of its data, NOT a screen size:
  //   - LARGE  (basis min(100%,30rem), grow 4): Portfolio exposure, Activity, Recent
  //     activity — dense / wide data (chart needs width, timelines are tall).
  //   - MEDIUM (basis min(100%,18rem), grow 2): Rebalancing, Vaults, Data health.
  //   - SMALL  (basis min(100%,15rem), grow 1): Market, Recent clients — often sparse, so
  //     they stay COMPACT and pack side by side instead of a big empty box. No
  //     `sparse` flag: the small base keeps them compact and their height = their
  //     real content (an empty tile ends short; the next tile sits beside it).
  //
  // Column count EMERGES from the bases: `flex-wrap` only wraps while shrinking →
  // MONOTONE by construction, no threshold in the rail jump zone [680,975] (the
  // #61 cliff). No named breakpoint, no width cap, no flex-1 fill.
  it('lays out a data-weighted bento via flex-wrap — no viewport/named breakpoint', () => {
    expect(SOURCE).toMatch(/flex flex-wrap items-start gap-4/)
    // Data-weight tiers as intrinsic flex-bases (min caps squeeze at narrow widths).
    const large = [...SOURCE.matchAll(/flex-\[4_1_min\(100%,30rem\)\]/g)]
    const medium = [...SOURCE.matchAll(/flex-\[2_1_min\(100%,18rem\)\]/g)]
    const small = [...SOURCE.matchAll(/flex-\[1_1_min\(100%,15rem\)\]/g)]
    expect(large.length).toBe(3) //  Portfolio, Activity, Recent activity
    expect(medium.length).toBe(3) // Rebalancing, Vaults, Data health
    expect(small.length).toBe(2) //  Market, Recent clients
    // No named viewport breakpoints, no container-query threshold, no grid modes.
    expect(SOURCE).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols/)
    expect(SOURCE).not.toMatch(/min-\[\d+px\]:grid-cols/)
    expect(SOURCE).not.toMatch(/@\[\d/)
    expect(SOURCE).not.toMatch(/@container/)
    // No hard width caps, no data-state branching, no flex-1 fill.
    expect(SOURCE).not.toMatch(/marketSparse|clientsSparse/)
    expect(SOURCE).not.toMatch(/max-w-sm|max-w-3xl|w-\[min\(100%,20rem\)\]|w-\[\d/)
    expect(SOURCE).not.toMatch(/["' ]flex-1["' ]/) // the utility class, not the word in prose
    // All eight panels still present.
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

  // Data-weight ordering: the large tiles must carry a strictly larger intrinsic
  // basis than the small ones, so a sparse panel can never out-size a rich one.
  it('bento tile basis is ordered by data weight (large > medium > small)', () => {
    const basisRows = [...SOURCE.matchAll(/flex-\[(\d+)_1_min\(100%,(\d+)rem\)\]/g)].map((m) => ({
      grow: Number(m[1]),
      basis: Number(m[2]),
    }))
    expect(basisRows.length).toBe(8) // one per panel
    const large = Math.min(...basisRows.filter((b) => b.grow === 4).map((b) => b.basis))
    const small = Math.max(...basisRows.filter((b) => b.grow === 1).map((b) => b.basis))
    expect(large, 'a large (rich-data) tile must have a bigger basis than any small tile').toBeGreaterThan(small)
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
