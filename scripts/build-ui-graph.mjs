#!/usr/bin/env node
/**
 * Hearst UI architecture graph — derived observation map.
 *
 * CODE = truth. GRAPH = map.
 * Rebuild: `pnpm graph:ui`
 * Status (non-blocking): `pnpm graph:check`
 *
 * V1 uses an explicit business-region catalog. Paths and evidence strings are
 * validated against the filesystem / source contents. Mermaid is generated
 * from JSON only — never maintained separately.
 */

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_JSON = join(ROOT, 'docs/architecture/ui-graph.json')
const OUT_MMD = join(ROOT, 'docs/architecture/ui-graph.mmd')

const NODE_TYPES = new Set([
  'ROUTE',
  'PAGE',
  'BUSINESS_REGION',
  'COMPONENT',
  'LAYOUT_PRIMITIVE',
  'SURFACE_PRIMITIVE',
  'DATA_SOURCE',
  'CHART',
  'STATE_BOUNDARY',
  'FOUNDATION',
])

const EDGE_TYPES = new Set([
  'renders',
  'contains',
  'loads',
  'uses_surface',
  'uses_layout',
  'uses_chart',
  'uses_foundation',
  'navigates_to',
  'owns_geometry',
  'owns_data_slot',
])

const CHECK = process.argv.includes('--check')
const WRITE = !CHECK

// ── Catalog (explicit, evidence-backed) ─────────────────────────────────────

/** @returns {{ nodes: object[], edges: object[] }} */
function catalog() {
  /** @type {object[]} */
  const nodes = []
  /** @type {object[]} */
  const edges = []

  const n = (node) => {
    nodes.push(node)
  }
  const e = (from, type, to, extra = {}) => {
    edges.push({ from, to, type, ...extra })
  }

  // ── Foundations (shared) ──────────────────────────────────────────────────
  n({
    id: 'foundation:color',
    type: 'FOUNDATION',
    name: 'Color tokens (fg / ink / accent / status)',
    domain: 'shared',
    source: 'src/styles/tailwind.css',
    evidence: '@theme color tokens — shared by admin and account',
  })
  n({
    id: 'foundation:console-surface',
    type: 'FOUNDATION',
    name: 'Console surface tokens',
    domain: 'shared',
    source: 'src/styles/tailwind.css',
    evidence: '--color-console-surface / console-card / console-shell',
  })
  n({
    id: 'foundation:console-card',
    type: 'FOUNDATION',
    name: 'Console card token',
    domain: 'shared',
    source: 'src/styles/tailwind.css',
    evidence: '--color-console-card consumed by admin surfaceBox and account CSS',
  })
  n({
    id: 'foundation:typography',
    type: 'FOUNDATION',
    name: 'Typography (Satoshi)',
    domain: 'shared',
    source: 'src/styles/tailwind.css',
    evidence: '--font-satoshi / font-sans / font-display',
  })
  n({
    id: 'foundation:charts',
    type: 'FOUNDATION',
    name: 'Chart language boundary',
    domain: 'shared',
    source: 'src/components/charts/index.ts',
    evidence: 'public chart exports — recharts never imported by routes',
  })
  n({
    id: 'foundation:chart-viewport',
    type: 'FOUNDATION',
    name: 'Chart viewport roles (compact/standard/hero/donut)',
    domain: 'shared',
    source: 'src/components/charts/core/chart-theme.ts',
    evidence: 'CHART_VIEWPORT_PX / chartViewport(role) — dataset length ignored',
    geometryOwner: 'component',
    datasetControlsGeometry: false,
  })
  n({
    id: 'foundation:motion',
    type: 'FOUNDATION',
    name: 'Motion readiness',
    domain: 'shared',
    source: 'src/features/user-dashboard/motion-guard.ts',
    evidence: 'motion readiness guard used by account dashboard',
  })

  // ── Shared chart components ───────────────────────────────────────────────
  const charts = [
    ['chart:hearst-line', 'HearstLineChart'],
    ['chart:allocation-dual-line', 'AllocationDualLineChart'],
    ['chart:hearst-activity', 'HearstActivityChart'],
    ['chart:signed-bar', 'SignedBarChart'],
    ['chart:hearst-allocation', 'HearstAllocationChart'],
    ['chart:breakdown-donut', 'HearstBreakdownDonut'],
    ['chart:exposure-radial', 'HearstExposureRadial'],
    ['chart:rich-sparkline', 'RichSparkline'],
    ['chart:hearst-donut', 'HearstDonutChart'],
    ['chart:chart-frame', 'ChartFrame'],
  ]
  for (const [id, name] of charts) {
    n({
      id,
      type: 'CHART',
      name,
      domain: 'shared',
      source: 'src/components/charts/index.ts',
      evidence: `export ${name}`,
      surface: null,
    })
    e(id, 'uses_foundation', 'foundation:charts')
    e(id, 'uses_foundation', 'foundation:chart-viewport')
  }
  e('foundation:chart-viewport', 'uses_foundation', 'foundation:charts')

  // ── Admin surface / layout primitives ─────────────────────────────────────
  n({
    id: 'surface:admin-box',
    type: 'SURFACE_PRIMITIVE',
    name: 'surfaceBox',
    domain: 'admin',
    source: 'src/components/admin/surface.tsx',
    evidence: 'export const surfaceBox',
    surface: { kind: 'admin:surfaceBox' },
  })
  n({
    id: 'surface:admin-inset',
    type: 'SURFACE_PRIMITIVE',
    name: 'surfaceInset',
    domain: 'admin',
    source: 'src/components/admin/surface.tsx',
    evidence: 'export const surfaceInset',
    surface: { kind: 'admin:surfaceInset' },
  })
  n({
    id: 'surface:admin-nav',
    type: 'SURFACE_PRIMITIVE',
    name: 'surfaceNav',
    domain: 'admin',
    source: 'src/components/admin/surface.tsx',
    evidence: 'export const surfaceNav',
    surface: { kind: 'admin:surfaceNav' },
  })
  n({
    id: 'surface:admin-select',
    type: 'SURFACE_PRIMITIVE',
    name: 'surfaceSelect',
    domain: 'admin',
    source: 'src/components/admin/surface.tsx',
    evidence: 'export const surfaceSelect',
    surface: { kind: 'admin:surfaceSelect' },
  })
  n({
    id: 'surface:admin-panel',
    type: 'SURFACE_PRIMITIVE',
    name: 'Panel',
    domain: 'admin',
    source: 'src/components/compositions/panel.tsx',
    evidence: 'export function Panel',
    surface: { kind: 'admin:Panel' },
  })
  n({
    id: 'surface:admin-dash-card',
    type: 'SURFACE_PRIMITIVE',
    name: 'DashCard',
    domain: 'admin',
    source: 'src/components/admin/dashboard/shell.tsx',
    evidence: 'export function DashCard',
    surface: { kind: 'admin:DashCard' },
  })
  n({
    id: 'layout:admin-bento-grid',
    type: 'LAYOUT_PRIMITIVE',
    name: 'BentoGrid',
    domain: 'admin',
    source: 'src/components/admin/grid.tsx',
    evidence: 'export function BentoGrid',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  n({
    id: 'layout:admin-bento-card',
    type: 'LAYOUT_PRIMITIVE',
    name: 'BentoCard',
    domain: 'admin',
    source: 'src/components/admin/grid.tsx',
    evidence: 'export function BentoCard',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  n({
    id: 'layout:admin-application',
    type: 'LAYOUT_PRIMITIVE',
    name: 'AdminApplicationLayout',
    domain: 'admin',
    source: 'src/components/admin/application-layout.tsx',
    evidence: 'export function AdminApplicationLayout',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  n({
    id: 'layout:admin-dashboard-shell',
    type: 'LAYOUT_PRIMITIVE',
    name: 'DashboardShell',
    domain: 'admin',
    source: 'src/components/admin/dashboard/shell.tsx',
    evidence: 'export function DashboardShell',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })

  e('surface:admin-box', 'uses_foundation', 'foundation:console-card')
  e('surface:admin-box', 'uses_foundation', 'foundation:console-surface')
  e('surface:admin-inset', 'uses_foundation', 'foundation:console-surface')
  e('surface:admin-nav', 'uses_foundation', 'foundation:console-surface')
  e('surface:admin-panel', 'uses_surface', 'surface:admin-box')
  e('surface:admin-dash-card', 'uses_surface', 'surface:admin-box')
  e('surface:admin-dash-card', 'uses_foundation', 'foundation:console-card')
  e('layout:admin-application', 'uses_surface', 'surface:admin-nav')
  e('chart:chart-frame', 'uses_surface', 'surface:admin-panel')

  // ── Account surface / layout ──────────────────────────────────────────────
  n({
    id: 'surface:account-shell',
    type: 'SURFACE_PRIMITIVE',
    name: '.shell (account user shell)',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.css',
    evidence: '.ud-root .shell',
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'layout:account-shell',
    type: 'LAYOUT_PRIMITIVE',
    name: 'Account dashboard shell geometry',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.css',
    evidence: 'CSS grid bands: .kpis / .analysis / .exposure-cap / .movements',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  e('surface:account-shell', 'uses_foundation', 'foundation:console-surface')
  e('surface:account-shell', 'uses_foundation', 'foundation:console-card')
  e('surface:account-shell', 'uses_foundation', 'foundation:color')
  e('layout:account-shell', 'uses_surface', 'surface:account-shell')

  // ── Account routes / page ─────────────────────────────────────────────────
  n({
    id: 'route:account',
    type: 'ROUTE',
    name: '/account',
    domain: 'account',
    role: 'USER_HUB',
    source: 'src/app/account/page.tsx',
    evidence: 'Canonical user hub — session-scoped command center',
  })
  n({
    id: 'page:account-dashboard',
    type: 'PAGE',
    name: 'Account dashboard page',
    domain: 'account',
    source: 'src/app/account/page.tsx',
    evidence: 'UserDashboardView data={data}',
  })
  n({
    id: 'layout:account-session-guard',
    type: 'LAYOUT_PRIMITIVE',
    name: 'Account layout (session guard only)',
    domain: 'account',
    source: 'src/app/account/layout.tsx',
    evidence: 'requireSession — no chrome; dashboard owns viewport',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  n({
    id: 'component:user-dashboard',
    type: 'COMPONENT',
    name: 'UserDashboardView',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'export function UserDashboardView',
    surface: { kind: 'account:user-shell' },
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
  })
  n({
    id: 'data:user-dashboard',
    type: 'DATA_SOURCE',
    name: 'loadUserDashboard',
    domain: 'account',
    source: 'src/features/user-dashboard/load.ts',
    evidence: 'export async function loadUserDashboard',
  })
  n({
    id: 'state:account-availability',
    type: 'STATE_BOUNDARY',
    name: 'Account Availability fields',
    domain: 'account',
    source: 'src/features/user-dashboard/load.ts',
    evidence: 'Availability<T> via availabilityFromResolved — named absences',
  })
  n({
    id: 'state:account-client-toggles',
    type: 'STATE_BOUNDARY',
    name: 'Account client UI toggles',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: "route: 'dashboard' | 'trade'; central chart key",
  })

  e('route:account', 'renders', 'page:account-dashboard')
  e('route:account', 'uses_layout', 'layout:account-session-guard')
  e('page:account-dashboard', 'renders', 'component:user-dashboard')
  e('page:account-dashboard', 'loads', 'data:user-dashboard')
  e('component:user-dashboard', 'uses_layout', 'layout:account-shell')
  e('component:user-dashboard', 'uses_surface', 'surface:account-shell')
  e('component:user-dashboard', 'owns_data_slot', 'data:user-dashboard')
  e('data:user-dashboard', 'contains', 'state:account-availability')
  e('component:user-dashboard', 'contains', 'state:account-client-toggles')
  e('component:user-dashboard', 'uses_foundation', 'foundation:typography')
  e('component:user-dashboard', 'uses_foundation', 'foundation:motion')

  // Account business regions
  n({
    id: 'region:account-nav',
    type: 'BUSINESS_REGION',
    name: 'Nav',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'header.nav + aria-label="Main navigation"',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'region:account-kpis',
    type: 'BUSINESS_REGION',
    name: 'Fund indicators',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'section.kpis aria-label="Fund indicators"',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'region:account-analysis',
    type: 'BUSINESS_REGION',
    name: 'Fund analysis',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'section.analysis aria-label="Fund analysis"',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'region:account-central-chart',
    type: 'BUSINESS_REGION',
    name: 'Fund chart',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'aria-label="Fund chart" + .center-plot',
    geometryOwner: 'component',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'region:account-exposure',
    type: 'BUSINESS_REGION',
    name: 'Strategy exposure and capacity',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'section.exposure-cap aria-label="Strategy exposure and capacity"',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })
  n({
    id: 'region:account-movements',
    type: 'BUSINESS_REGION',
    name: 'Your movements',
    domain: 'account',
    source: 'src/features/user-dashboard/user-dashboard.tsx',
    evidence: 'section.movements aria-label="Your movements"',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'account:user-shell' },
  })

  e('component:user-dashboard', 'contains', 'region:account-nav')
  e('component:user-dashboard', 'contains', 'region:account-kpis')
  e('component:user-dashboard', 'contains', 'region:account-analysis')
  e('component:user-dashboard', 'contains', 'region:account-exposure')
  e('component:user-dashboard', 'contains', 'region:account-movements')
  e('region:account-analysis', 'contains', 'region:account-central-chart')
  e('region:account-kpis', 'owns_geometry', 'layout:account-shell')
  e('region:account-analysis', 'owns_geometry', 'layout:account-shell')
  e('region:account-exposure', 'owns_geometry', 'layout:account-shell')
  e('region:account-movements', 'owns_geometry', 'layout:account-shell')

  // Account components
  n({
    id: 'component:stat-tile',
    type: 'COMPONENT',
    name: 'StatTile',
    domain: 'account',
    source: 'src/features/user-dashboard/stat-tile.tsx',
    evidence: 'export function StatTile',
    surface: null,
    geometryOwner: 'component',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
  })
  n({
    id: 'component:breakdown-flank',
    type: 'COMPONENT',
    name: 'BreakdownFlank',
    domain: 'account',
    source: 'src/features/user-dashboard/breakdown-flank.tsx',
    evidence: 'export function BreakdownFlank',
    surface: null,
    geometryOwner: 'component',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    note: 'heading over an intrinsic Recharts breakdown donut; ring in the donut viewport, legend intrinsic — slice count never resizes the band',
  })
  n({
    id: 'component:movement-timeline',
    type: 'COMPONENT',
    name: 'MovementTimeline',
    domain: 'account',
    source: 'src/features/user-dashboard/movement-timeline.tsx',
    evidence: 'export function MovementTimeline',
    surface: null,
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    note: 'list length grows document height; band grid stays layout-owned',
  })
  n({
    id: 'component:capacity-meter',
    type: 'COMPONENT',
    name: 'CapacityMeter',
    domain: 'account',
    source: 'src/features/user-dashboard/capacity-meter.tsx',
    evidence: 'export function CapacityMeter',
    surface: null,
    geometryOwner: 'component',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    note: 'FILL width = data pct; shell track geometry = component',
  })
  e('region:account-kpis', 'renders', 'component:stat-tile')
  e('component:stat-tile', 'uses_chart', 'chart:rich-sparkline')
  e('region:account-analysis', 'renders', 'component:breakdown-flank')
  e('component:breakdown-flank', 'uses_chart', 'chart:breakdown-donut')
  e('region:account-central-chart', 'uses_chart', 'chart:hearst-line')
  e('region:account-central-chart', 'uses_chart', 'chart:allocation-dual-line')
  e('region:account-central-chart', 'uses_chart', 'chart:hearst-activity')
  e('region:account-central-chart', 'uses_chart', 'chart:signed-bar')
  e('region:account-exposure', 'uses_chart', 'chart:exposure-radial')
  e('region:account-exposure', 'renders', 'component:capacity-meter')
  e('region:account-movements', 'renders', 'component:movement-timeline')
  e('component:breakdown-flank', 'uses_foundation', 'foundation:charts')
  e('component:capacity-meter', 'owns_data_slot', 'data:user-dashboard')

  // Account redirects (navigation only)
  for (const [id, path, source] of [
    ['route:account-dashboard-redirect', '/account/dashboard', 'src/app/account/dashboard/page.tsx'],
    ['route:account-profile-redirect', '/account/profile', 'src/app/account/profile/page.tsx'],
    ['route:account-bitcoin-redirect', '/account/bitcoin', 'src/app/account/bitcoin/page.tsx'],
    ['route:account-activity-redirect', '/account/activity', 'src/app/account/activity/page.tsx'],
  ]) {
    n({
      id,
      type: 'ROUTE',
      name: path,
      domain: 'account',
      role: 'REDIRECT',
      source,
      evidence: "redirect('/account')",
    })
    e(id, 'navigates_to', 'route:account')
  }

  // ── Admin routes ──────────────────────────────────────────────────────────
  const adminRoutes = [
    ['route:admin', '/admin', 'src/app/admin/page.tsx', 'ADMIN_HUB', 'loadAdminDashboard → AdminDashboardPage'],
    ['route:admin-vaults', '/admin/vaults', 'src/app/admin/vaults/page.tsx', 'ADMIN_PAGE', 'loadAdminRegistry'],
    ['route:admin-vault-detail', '/admin/vaults/[vaultId]', 'src/app/admin/vaults/[vaultId]/page.tsx', 'ADMIN_PAGE', 'loadVault + charts'],
    ['route:admin-clients', '/admin/clients', 'src/app/admin/clients/page.tsx', 'ADMIN_PAGE', 'loadAdminClientsDirectory'],
    ['route:admin-compliance', '/admin/compliance', 'src/app/admin/compliance/page.tsx', 'ADMIN_PAGE', 'loadAdminRegistry Som KYC'],
    ['route:admin-operations', '/admin/operations', 'src/app/admin/operations/page.tsx', 'ADMIN_PAGE', 'loadAdminOperationsSurface'],
    ['route:admin-runtime', '/admin/runtime', 'src/app/admin/runtime/page.tsx', 'ADMIN_PAGE', 'runtime/health/ready + DataCoverageSection'],
    ['route:admin-api-explorer', '/admin/api-explorer', 'src/app/admin/api-explorer/page.tsx', 'ADMIN_PAGE', 'BACKEND_ENDPOINTS registry'],
    ['route:admin-product', '/admin/product', 'src/app/admin/product/page.tsx', 'ADMIN_PAGE', 'mining/btc/factsheet/backtest'],
    ['route:admin-series-1', '/admin/series-1', 'src/app/admin/series-1/page.tsx', 'ADMIN_PAGE', 'series1-events'],
    ['route:admin-keeper', '/admin/keeper', 'src/app/admin/keeper/page.tsx', 'ADMIN_PAGE', 'KeeperForm'],
    ['route:admin-profile', '/admin/profile', 'src/app/admin/profile/page.tsx', 'ADMIN_PAGE', 'getSession identity'],
  ]
  for (const [id, name, source, role, evidence] of adminRoutes) {
    n({ id, type: 'ROUTE', name, domain: 'admin', role, source, evidence })
    e(id, 'uses_layout', 'layout:admin-application')
  }

  n({
    id: 'layout:admin-session',
    type: 'LAYOUT_PRIMITIVE',
    name: 'Admin layout (session + application shell)',
    domain: 'admin',
    source: 'src/app/admin/layout.tsx',
    evidence: 'requireSession + AdminApplicationLayout',
    geometryOwner: 'layout',
    datasetControlsGeometry: false,
  })
  e('layout:admin-session', 'contains', 'layout:admin-application')
  e('route:admin', 'uses_layout', 'layout:admin-session')

  // Admin redirects
  for (const [id, path, source, target, evidence] of [
    ['route:admin-dashboard-redirect', '/admin/dashboard', 'src/app/admin/dashboard/page.tsx', 'route:admin', "redirect('/admin')"],
    ['route:admin-vault-redirect', '/admin/vault', 'src/app/admin/vault/page.tsx', 'route:admin-vaults', "redirect('/admin/vaults')"],
    ['route:admin-conformite-redirect', '/admin/conformite', 'src/app/admin/conformite/page.tsx', 'route:admin-compliance', "redirect('/admin/compliance')"],
    ['route:admin-produit-redirect', '/admin/produit', 'src/app/admin/produit/page.tsx', 'route:admin-product', "redirect('/admin/product')"],
  ]) {
    n({ id, type: 'ROUTE', name: path, domain: 'admin', role: 'REDIRECT', source, evidence })
    e(id, 'navigates_to', target)
  }

  // Admin dashboard page + regions
  n({
    id: 'page:admin-dashboard',
    type: 'PAGE',
    name: 'Admin dashboard page',
    domain: 'admin',
    source: 'src/features/admin-dashboard/admin-dashboard-page.tsx',
    evidence: 'export function AdminDashboardPage',
  })
  n({
    id: 'data:admin-dashboard',
    type: 'DATA_SOURCE',
    name: 'loadAdminDashboard',
    domain: 'admin',
    source: 'src/lib/admin-dashboard/load.ts',
    evidence: 'export async function loadAdminDashboard',
  })
  n({
    id: 'state:admin-availability',
    type: 'STATE_BOUNDARY',
    name: 'Admin dashboard Availability pack',
    domain: 'admin',
    source: 'src/lib/admin-dashboard/load.ts',
    evidence: 'parallel callBackend → Availability fields',
  })

  e('route:admin', 'renders', 'page:admin-dashboard')
  e('page:admin-dashboard', 'loads', 'data:admin-dashboard')
  e('page:admin-dashboard', 'uses_layout', 'layout:admin-dashboard-shell')
  e('page:admin-dashboard', 'uses_layout', 'layout:admin-bento-grid')
  e('data:admin-dashboard', 'contains', 'state:admin-availability')

  n({
    id: 'region:admin-kpi-header',
    type: 'BUSINESS_REGION',
    name: 'Dashboard KPI header',
    domain: 'admin',
    source: 'src/components/admin/dashboard/header.tsx',
    evidence: 'DashboardHeader → AdminPageHeader KPIs',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'admin:DashCard' },
  })
  n({
    id: 'region:admin-bento-body',
    type: 'BUSINESS_REGION',
    name: 'Bento masonry body',
    domain: 'admin',
    source: 'src/features/admin-dashboard/admin-dashboard-page.tsx',
    evidence: 'BentoGrid → BentoCard → DashCard panels',
    geometryOwner: 'layout',
    dataSlotOwner: 'component',
    datasetControlsGeometry: false,
    surface: { kind: 'admin:DashCard' },
  })

  e('page:admin-dashboard', 'contains', 'region:admin-kpi-header')
  e('page:admin-dashboard', 'contains', 'region:admin-bento-body')
  e('region:admin-bento-body', 'uses_layout', 'layout:admin-bento-grid')
  e('region:admin-bento-body', 'uses_layout', 'layout:admin-bento-card')
  e('region:admin-bento-body', 'uses_surface', 'surface:admin-dash-card')
  e('region:admin-bento-body', 'owns_geometry', 'layout:admin-bento-grid')

  const adminPanels = [
    ['region:admin-portfolio-exposure', 'Portfolio exposure', 'src/components/admin/dashboard/portfolio-exposure.tsx', 'PortfolioExposurePanel', 'chart:hearst-donut'],
    ['region:admin-activity-curve', 'Activity curve', 'src/features/admin-dashboard/admin-dashboard-page.tsx', 'ActivityChartSlot / HearstActivityChart', 'chart:hearst-activity'],
    ['region:admin-recent-activity', 'Recent activity timeline', 'src/components/admin/dashboard/activity-timeline.tsx', 'ActivityTimelinePanel', null],
    ['region:admin-rebalancing', 'Rebalancing & alerts', 'src/components/admin/dashboard/rebalancing-panel.tsx', 'RebalancingAlertsPanel', null],
    ['region:admin-rebalancing-history', 'Rebalancing drift history', 'src/features/admin-dashboard/admin-dashboard-page.tsx', 'RebalancingHistorySlot / HearstLineChart', 'chart:hearst-line'],
    ['region:admin-vaults-capital', 'Vaults capital', 'src/components/admin/dashboard/vaults-panel.tsx', 'VaultsPanel', null],
    ['region:admin-data-health', 'Data health', 'src/components/admin/dashboard/data-health-grid.tsx', 'DataHealthGrid', null],
    ['region:admin-market', 'Market snapshot', 'src/components/admin/dashboard/market-panel.tsx', 'MarketSnapshotPanel', null],
    ['region:admin-cbbtc-allocation', 'cbBTC/USDC allocation', 'src/features/admin-dashboard/admin-dashboard-page.tsx', 'AllocationSlot / AllocationDualLineChart', 'chart:allocation-dual-line'],
    ['region:admin-btc-price', 'BTC price', 'src/features/admin-dashboard/admin-dashboard-page.tsx', 'BtcPriceSlot / HearstLineChart', 'chart:hearst-line'],
    ['region:admin-recent-clients', 'Recent clients', 'src/components/admin/dashboard/recent-clients-panel.tsx', 'RecentClientsPanel', null],
  ]

  for (const [id, name, source, evidence, chartId] of adminPanels) {
    n({
      id,
      type: 'BUSINESS_REGION',
      name,
      domain: 'admin',
      source,
      evidence,
      geometryOwner: 'layout',
      dataSlotOwner: 'component',
      datasetControlsGeometry: false,
      surface: { kind: 'admin:DashCard' },
    })
    e('region:admin-bento-body', 'contains', id)
    e(id, 'uses_surface', 'surface:admin-dash-card')
    if (chartId) e(id, 'uses_chart', chartId)
  }

  e('region:admin-portfolio-exposure', 'uses_surface', 'surface:admin-select')
  e('region:admin-data-health', 'uses_surface', 'surface:admin-box')
  e('region:admin-market', 'uses_surface', 'surface:admin-inset')

  // Other admin pages — thin page nodes (not full card trees)
  n({
    id: 'page:admin-runtime',
    type: 'PAGE',
    name: 'Admin runtime page',
    domain: 'admin',
    source: 'src/app/admin/runtime/page.tsx',
    evidence: 'runtime/health/ready + DataCoverageSection',
  })
  n({
    id: 'component:data-coverage',
    type: 'COMPONENT',
    name: 'DataCoverageSection',
    domain: 'admin',
    source: 'src/features/admin-runtime/data-coverage-section.tsx',
    evidence: 'export function DataCoverageSection',
    surface: { kind: 'admin:Panel' },
  })
  e('route:admin-runtime', 'renders', 'page:admin-runtime')
  e('page:admin-runtime', 'renders', 'component:data-coverage')
  e('component:data-coverage', 'uses_chart', 'chart:hearst-donut')
  e('component:data-coverage', 'uses_chart', 'chart:chart-frame')

  n({
    id: 'page:admin-api-explorer',
    type: 'PAGE',
    name: 'API explorer page',
    domain: 'admin',
    source: 'src/app/admin/api-explorer/page.tsx',
    evidence: 'BACKEND_ENDPOINTS + ChartFrame/HearstDonutChart',
  })
  e('route:admin-api-explorer', 'renders', 'page:admin-api-explorer')
  e('page:admin-api-explorer', 'uses_chart', 'chart:chart-frame')
  e('page:admin-api-explorer', 'uses_chart', 'chart:hearst-donut')

  n({
    id: 'page:admin-product',
    type: 'PAGE',
    name: 'Product page',
    domain: 'admin',
    source: 'src/app/admin/product/page.tsx',
    evidence: 'mining/btc/factsheet/backtest charts',
  })
  e('route:admin-product', 'renders', 'page:admin-product')
  e('page:admin-product', 'uses_chart', 'chart:chart-frame')

  n({
    id: 'page:admin-series-1',
    type: 'PAGE',
    name: 'Series 1 page',
    domain: 'admin',
    source: 'src/app/admin/series-1/page.tsx',
    evidence: 'series1-events + HearstActivityChart',
  })
  e('route:admin-series-1', 'renders', 'page:admin-series-1')
  e('page:admin-series-1', 'uses_chart', 'chart:hearst-activity')
  e('page:admin-series-1', 'uses_chart', 'chart:chart-frame')

  n({
    id: 'page:admin-vault-detail',
    type: 'PAGE',
    name: 'Vault detail page',
    domain: 'admin',
    source: 'src/app/admin/vaults/[vaultId]/page.tsx',
    evidence: 'loadVault + HearstAllocationChart / HearstDonutChart / HearstLineChart',
  })
  e('route:admin-vault-detail', 'renders', 'page:admin-vault-detail')
  e('page:admin-vault-detail', 'uses_chart', 'chart:hearst-allocation')
  e('page:admin-vault-detail', 'uses_chart', 'chart:hearst-donut')
  e('page:admin-vault-detail', 'uses_chart', 'chart:hearst-line')
  e('page:admin-vault-detail', 'uses_chart', 'chart:chart-frame')

  // Cross-surface: foundations fan into both trees (already edged); explicit note nodes none.
  // Accent foundation edge for both domains:
  e('component:user-dashboard', 'uses_foundation', 'foundation:color')
  e('page:admin-dashboard', 'uses_foundation', 'foundation:color')
  e('page:admin-dashboard', 'uses_foundation', 'foundation:charts')
  e('component:user-dashboard', 'uses_foundation', 'foundation:charts')
  e('surface:admin-box', 'uses_foundation', 'foundation:color')
  e('layout:admin-application', 'uses_foundation', 'foundation:typography')

  return { nodes, edges }
}

// ── Build / validate / serialize ────────────────────────────────────────────

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'UNKNOWN'
  }
}

function assertSources(nodes) {
  const missing = []
  for (const node of nodes) {
    if (!node.source) continue
    const abs = join(ROOT, node.source)
    if (!existsSync(abs)) missing.push(`${node.id} → ${node.source}`)
  }
  return missing
}

function assertEvidence(nodes) {
  /** Soft warnings — evidence substring should appear in source when possible. */
  const warnings = []
  for (const node of nodes) {
    if (!node.source || !node.evidence) continue
    const abs = join(ROOT, node.source)
    if (!existsSync(abs)) continue
    const text = readFileSync(abs, 'utf8')
    // Use a short distinctive fragment (first quoted string or first 24 chars of token-ish)
    const quoted = node.evidence.match(/"([^"]+)"/)
    const needle = quoted ? quoted[1] : null
    if (needle && !text.includes(needle)) {
      warnings.push(`${node.id}: evidence quote "${needle}" not found in ${node.source}`)
    }
  }
  return warnings
}

function normalizeGraph(raw, sourceSha, generatedAt) {
  const nodes = [...raw.nodes]
  const edges = [...raw.edges]

  const ids = new Set()
  for (const node of nodes) {
    if (!node.id) throw new Error('Node missing id')
    if (ids.has(node.id)) throw new Error(`Duplicate node id: ${node.id}`)
    ids.add(node.id)
    if (!NODE_TYPES.has(node.type)) throw new Error(`Invalid node type: ${node.type} (${node.id})`)
  }

  for (const edge of edges) {
    if (!EDGE_TYPES.has(edge.type)) throw new Error(`Invalid edge type: ${edge.type}`)
    if (!ids.has(edge.from)) throw new Error(`Edge from missing node: ${edge.from}`)
    if (!ids.has(edge.to)) throw new Error(`Edge to missing node: ${edge.to}`)
  }

  // ASCII code-unit order (not localeCompare) so `route:account` sorts before
  // `route:account-*` and Git diffs stay stable across machines/locales.
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  nodes.sort((a, b) => cmp(a.id, b.id))
  edges.sort((a, b) => cmp(a.from, b.from) || cmp(a.type, b.type) || cmp(a.to, b.to))

  const missing = assertSources(nodes)
  if (missing.length) {
    throw new Error(`Missing source files:\n${missing.map((m) => `  - ${m}`).join('\n')}`)
  }

  return {
    schemaVersion: 1,
    repo: 'Hearst-Corporation/hearst-connect-v1',
    sourceSha,
    generatedAt,
    doctrine: 'CODE = truth. GRAPH = derived observation map.',
    nodes,
    edges,
  }
}

function toMermaid(graph) {
  const lines = []
  lines.push('%% Generated by scripts/build-ui-graph.mjs — do not edit by hand')
  lines.push(`%% sourceSha: ${graph.sourceSha}`)
  lines.push('flowchart TB')
  lines.push('  subgraph shared_foundations["Shared foundations"]')
  for (const node of graph.nodes.filter((n) => n.type === 'FOUNDATION')) {
    lines.push(`    ${mermaidId(node.id)}["${escapeLabel(node.name)}"]`)
  }
  lines.push('  end')
  lines.push('  subgraph account_tree["Account component tree"]')
  for (const node of graph.nodes.filter((n) => n.domain === 'account' && n.type !== 'FOUNDATION')) {
    lines.push(`    ${mermaidId(node.id)}["${escapeLabel(nodeLabel(node))}"]`)
  }
  lines.push('  end')
  lines.push('  subgraph admin_tree["Admin component tree"]')
  for (const node of graph.nodes.filter((n) => n.domain === 'admin' && n.type !== 'FOUNDATION')) {
    lines.push(`    ${mermaidId(node.id)}["${escapeLabel(nodeLabel(node))}"]`)
  }
  lines.push('  end')

  // Keep Mermaid readable: only structural edges
  const keep = new Set([
    'renders',
    'contains',
    'loads',
    'uses_surface',
    'uses_layout',
    'uses_chart',
    'uses_foundation',
    'navigates_to',
  ])
  for (const edge of graph.edges) {
    if (!keep.has(edge.type)) continue
    // Skip dense foundation fan-out of every chart→foundation:charts (shown via subgraph)
    if (edge.type === 'uses_foundation' && edge.to === 'foundation:charts' && edge.from.startsWith('chart:')) {
      continue
    }
    lines.push(
      `  ${mermaidId(edge.from)} -->|${edge.type}| ${mermaidId(edge.to)}`,
    )
  }
  return `${lines.join('\n')}\n`
}

function mermaidId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

function escapeLabel(label) {
  return String(label).replace(/"/g, "'")
}

function nodeLabel(node) {
  if (node.type === 'ROUTE') return node.name
  if (node.type === 'BUSINESS_REGION') return `◈ ${node.name}`
  return node.name
}

function stableStringify(graph) {
  return `${JSON.stringify(graph, null, 2)}\n`
}

function stripVolatile(graph) {
  // sourceSha / generatedAt are rebuild stamps. Catalog currency is nodes+edges.
  const { generatedAt: _a, sourceSha: _s, ...rest } = graph
  return rest
}

function build() {
  const sourceSha = gitSha()
  // Deterministic timestamp for check comparisons is stripped; write uses real UTC.
  const generatedAt = new Date().toISOString()
  const raw = catalog()
  const graph = normalizeGraph(raw, sourceSha, generatedAt)
  const warnings = assertEvidence(graph.nodes)
  return { graph, warnings }
}

function writeOutputs(graph) {
  mkdirSync(dirname(OUT_JSON), { recursive: true })
  writeFileSync(OUT_JSON, stableStringify(graph), 'utf8')
  writeFileSync(OUT_MMD, toMermaid(graph), 'utf8')
}

function checkStatus() {
  const { graph, warnings } = build()
  for (const w of warnings) console.warn(`WARN ${w}`)

  if (!existsSync(OUT_JSON)) {
    console.log('GRAPH_INVALID')
    console.error('Missing docs/architecture/ui-graph.json — run pnpm graph:ui')
    process.exitCode = 1
    return
  }

  let committed
  try {
    committed = JSON.parse(readFileSync(OUT_JSON, 'utf8'))
  } catch (err) {
    console.log('GRAPH_INVALID')
    console.error(`Invalid JSON: ${err instanceof Error ? err.message : err}`)
    process.exitCode = 1
    return
  }

  try {
    normalizeGraph(
      { nodes: committed.nodes ?? [], edges: committed.edges ?? [] },
      committed.sourceSha ?? 'UNKNOWN',
      committed.generatedAt ?? new Date(0).toISOString(),
    )
  } catch (err) {
    console.log('GRAPH_INVALID')
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  const nextStable = JSON.stringify(stripVolatile(graph))
  const committedStable = JSON.stringify(stripVolatile(committed))

  if (nextStable === committedStable) {
    console.log('GRAPH_CURRENT')
    console.log(`sourceSha=${committed.sourceSha ?? 'none'} (stamp)`)
    console.log(`workingSha=${graph.sourceSha}`)
    console.log(`nodes=${graph.nodes.length} edges=${graph.edges.length}`)
    process.exitCode = 0
    return
  }

  console.log('GRAPH_STALE')
  console.log(`committedSha=${committed.sourceSha ?? 'none'}`)
  console.log(`workingSha=${graph.sourceSha}`)
  console.log(`nodes=${graph.nodes.length} edges=${graph.edges.length}`)
  console.log('Refresh with: pnpm graph:ui')
  // Non-blocking for V1
  process.exitCode = 0
}

function main() {
  if (CHECK) {
    checkStatus()
    return
  }

  const { graph, warnings } = build()
  for (const w of warnings) console.warn(`WARN ${w}`)
  writeOutputs(graph)
  console.log(`Wrote ${OUT_JSON}`)
  console.log(`Wrote ${OUT_MMD}`)
  console.log(`sourceSha=${graph.sourceSha}`)
  console.log(`nodes=${graph.nodes.length} edges=${graph.edges.length}`)
}

main()
