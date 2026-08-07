import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural contract — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 * Surface canonique : `/admin` (redirect legacy `/admin/dashboard`).
 */

const root = (p: string) => resolve(import.meta.dirname, '../../', p)
const PAGE = readFileSync(root('src/app/admin/page.tsx'), 'utf8')
const SOURCE = readFileSync(root('src/features/admin-dashboard/admin-dashboard-page.tsx'), 'utf8')
const HEADER = readFileSync(root('src/components/admin/dashboard/header.tsx'), 'utf8')
const KPI = readFileSync(root('src/components/admin/dashboard/kpi-grid.tsx'), 'utf8')
const STEPPER = readFileSync(root('src/components/admin/dashboard/subscription-journey.tsx'), 'utf8')
const QUEUE = readFileSync(root('src/components/admin/dashboard/action-queue.tsx'), 'utf8')
const ACTIONS = readFileSync(root('src/components/actions/hearst-actions.tsx'), 'utf8')

describe('/admin — structure dashboard (UI-ASSETS-005)', () => {
  it('uses Catalyst shell (no gray bag) and Heading header', () => {
    expect(SOURCE).toMatch(/<DashboardShell/)
    expect(SOURCE).toMatch(/<DashboardHeader/)
    expect(SOURCE).not.toMatch(/DashboardLightShell/)
    expect(SOURCE).not.toMatch(/bg-zinc-100/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
  })

  it('titles metadata as pilotage des souscriptions', () => {
    expect(PAGE).toMatch(/Pilotage des souscriptions/)
  })

  it('renders exactly four compact KPI metrics inside the header (no separate boxes)', () => {
    for (const label of [
      'Taux de conversion',
      'KYC en attente',
      'Souscriptions à traiter',
      'Souscriptions échouées',
    ]) {
      expect(SOURCE).toContain(label)
    }
    expect(SOURCE).toMatch(/<DashboardHeader/)
    expect(SOURCE).toMatch(/kpis=\{kpis\}/)
    expect(SOURCE).not.toMatch(/<DashboardKpiGrid/)
    expect(HEADER).toMatch(/DashboardKpiMetrics/)
    expect(HEADER).toMatch(/data-dashboard-kpi-bandeau/)
    expect(HEADER).toMatch(/-mx-6/)
    expect(HEADER).toMatch(/size-14|sm:size-16/)
    expect(HEADER).toMatch(/h-16|lg:h-20/)
    expect(HEADER).toMatch(/bg-black/)
    expect(HEADER).not.toMatch(/size-24|size-32|h-32|lg:h-48/)
    expect(HEADER).toMatch(/LogoMark/)
    expect(HEADER).not.toMatch(/Avatar|initials/)
    expect(HEADER).not.toMatch(/MagnifyingGlassIcon|BellIcon|UserCircleIcon/)
    expect(SOURCE).not.toContain('proxy wallet')
    expect(SOURCE).not.toContain('Comptes présents dans le registre')
    expect(SOURCE).not.toContain('Clients actifs')
    expect(SOURCE).not.toContain('Wallets actifs')
    expect(KPI).not.toMatch(/En direct/)
    expect(KPI).not.toMatch(/SourcePill|AdminReading|showRoute/)
    expect(KPI).not.toMatch(/DashboardKpiGrid|sparkline/)
    expect(KPI).not.toMatch(/rounded-xl|bg-white|ring-1|backdrop-blur/)
    expect(KPI).not.toMatch(/surfaceBox/)
  })

  it('replaces the six-column funnel with a real journey stepper (no comparative bars)', () => {
    expect(SOURCE).not.toMatch(/<FunnelColumns/)
    expect(SOURCE).toMatch(/<SubscriptionJourneyStepper/)
    expect(SOURCE).toContain('Parcours de souscription')
    expect(STEPPER).toMatch(/'use client'/)
    expect(STEPPER).toMatch(/TabGroup|TabList|TabPanel/)
    expect(STEPPER).not.toMatch(/role="meter"/)
    expect(STEPPER).not.toMatch(/height:\s*`?\$\{/)
    expect(STEPPER).toMatch(/data-widget="subscription-journey"/)
  })

  it('keeps actions in the priority queue and rebuilds it into a composition (not a blank card)', () => {
    expect(SOURCE).toMatch(/<ActionQueue/)
    expect(SOURCE).toContain('À traiter')
    expect(QUEUE).toContain('à traiter')
    expect(QUEUE).toContain('Rien à traiter')
    expect(QUEUE).toMatch(/HearstCriticalAction|HearstDangerAction/)
    expect(QUEUE).not.toMatch(/Math\.random\(/)
  })

  it('routes route-level actions through the Hearst actions boundary (not raw Aceternity)', () => {
    expect(HEADER).toContain('Ajouter un client')
    expect(HEADER).toContain('Création client non disponible côté backend')
    expect(HEADER).toMatch(/from ['"]@\/components\/actions['"]/)
    expect(HEADER).toMatch(/HearstPrimaryAction/)
    expect(HEADER).not.toContain('/admin/client-simulator')
    expect(SOURCE).not.toContain('/admin/client-simulator')
    expect(ACTIONS).toMatch(/from ['"]@\/components\/catalyst\/button['"]/)
    expect(ACTIONS).toMatch(/useReducedMotion/)
  })

  it('mounts charts and short placeholders — no API routes in UI copy', () => {
    expect(SOURCE).toMatch(/Courbe d’activité|Courbe d'activité/)
    expect(SOURCE).toMatch(/Donut KYC/)
    expect(SOURCE).toMatch(/Souscriptions par produit/)
    expect(SOURCE).toMatch(/Activité hebdomadaire/)
    expect(SOURCE).not.toMatch(/Wallets et dépôts/)
    expect(SOURCE).toMatch(/<ChartPlaceholder/)
    expect(SOURCE).not.toMatch(/GET \/api/)
    expect(SOURCE).not.toMatch(/expectedSource/)
    expect(SOURCE).not.toMatch(/<ChartFrame/)
  })

  it('renders subscriptions table (max 6) and sources at the bottom', () => {
    expect(SOURCE).toContain('Dernières souscriptions')
    expect(SOURCE).toMatch(/slice\(0,\s*6\)/)
    expect(SOURCE).toMatch(/<SourceStatusGrid/)
    expect(SOURCE).toContain('État des sources')
  })

  it('keeps charts behind the Hearst boundary (recharts only, no MUI X)', () => {
    expect(SOURCE).toMatch(/from ['"]@\/components\/charts['"]/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
    expect(SOURCE).not.toMatch(/from ['"]recharts['"]/)
  })

  it('uses Hearst mint accent only — no orange, no rainbow KPI tones', () => {
    expect(SOURCE).not.toMatch(/tone:\s*['"]blue['"]/)
    expect(SOURCE).not.toMatch(/tone:\s*['"]violet['"]/)
    expect(SOURCE).not.toMatch(/tone:\s*['"]green['"]/)
    expect(SOURCE).not.toMatch(/orange/)
    expect(HEADER).not.toMatch(/color=['"]orange['"]/)
    expect(KPI).not.toMatch(/sky-|violet-|orange-/)
    expect(KPI).toMatch(/accent-/)
    expect(STEPPER).not.toMatch(/bg-sky-|bg-violet-|bg-rose-|bg-orange-/)
    expect(STEPPER).toMatch(/accent-/)
  })

  it('is loaded by a server page reading the shared registry', () => {
    expect(PAGE).not.toMatch(/^'use client'/)
    expect(PAGE).toContain('loadAdminRegistry')
    expect(PAGE).toContain('requireSession')
    expect(SOURCE).not.toMatch(/Math\.random\(/)
  })
})
