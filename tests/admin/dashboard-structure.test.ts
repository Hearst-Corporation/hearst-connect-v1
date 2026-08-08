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

  // HC-ADMIN-TRUE-FLUID-RESPONSIVE — intrinsic composition, no named breakpoint.
  //
  // The dashboard is a MAIN COLUMN (dense/tall panels) + a SECONDARY RAIL
  // (short/status panels), each its own vertical flow, placed side by side with
  // `flex-wrap`. No paired rows → a tall panel never imposes its track height on
  // a short neighbour → no reserved vertical void, no flex-1 fill, no width cap.
  //
  // The 2→1 switch EMERGES from the two intrinsic flex-bases: the rail wraps
  // under the main as soon as `44rem + 18rem + gap` no longer fits the REAL
  // container width. `flex-wrap` only wraps while shrinking and only unwraps
  // while growing → MONOTONE by construction, with no container-query threshold
  // that could re-fire inside the sidebar-rail jump zone (the #61 cliff).
  //   - main base 44rem = measured min-content of the Activity chart (legible).
  //   - rail base 18rem = measured min-viable width of the tightest rail panel.
  // Neither is a screen dimension; no card knows the viewport size.
  it('composes two intrinsic columns via flex-wrap — no viewport/named breakpoint', () => {
    // Intrinsic wrap container: flex + flex-wrap, not a device media grid.
    expect(SOURCE).toMatch(/flex flex-wrap items-start gap-4/)
    // Two independent columns with intrinsic flex-basis (content-derived).
    expect(SOURCE).toMatch(/flex-\[999_1_44rem\]/) // main: greedy grow, base = chart legible
    expect(SOURCE).toMatch(/flex-\[1_1_18rem\]/) //   rail: grows too, base = min viable
    // No named viewport breakpoints driving the dashboard layout.
    expect(SOURCE).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols/)
    expect(SOURCE).not.toMatch(/min-\[\d+px\]:grid-cols/)
    // No container-query composition threshold either (flex-wrap replaces it).
    expect(SOURCE).not.toMatch(/@\[\d/)
    expect(SOURCE).not.toMatch(/@container/)
    // No hard width caps, no data-state branching, no flex-1 fill.
    expect(SOURCE).not.toMatch(/marketSparse|clientsSparse/)
    expect(SOURCE).not.toMatch(/max-w-sm|max-w-3xl|w-\[min\(100%,20rem\)\]|w-\[\d/)
    expect(SOURCE).not.toMatch(/["' ]flex-1["' ]/) // the utility class, not the word in prose
    // All eight panels still present.
    for (const t of [
      'Portfolio exposure', 'Activity', 'Vaults', 'Recent activity',
      'Rebalancing & alerts', 'Market', 'Recent clients', 'Data health',
    ]) {
      expect(SOURCE).toContain(t)
    }
  })

  // Monotonicity guard (the check the point-tests were missing): the combined
  // intrinsic base of the two columns must be ≥ 976px so the wrap point sits
  // ABOVE the sidebar-rail jump zone [680, 975] and can never re-fire there.
  // Derived directly from the flex-[…] bases in the source.
  it('combined column base ≥ 976px so the intrinsic wrap stays monotonic', () => {
    const bases = [...SOURCE.matchAll(/flex-\[\d+_\d+_(\d+(?:\.\d+)?)rem\]/g)].map((m) => Number(m[1]))
    expect(bases.length).toBe(2) // main + rail
    const combinedPx = bases.reduce((a, b) => a + b, 0) * 16
    expect(combinedPx, 'main+rail flex-basis must total ≥ 976px to stay monotonic across the rail jump').toBeGreaterThanOrEqual(976)
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
