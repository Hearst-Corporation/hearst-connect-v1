import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural contract — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Cette mission REMPLACE délibérément deux décisions de HC-ADMIN-DASHBOARD-
 * VISUAL-CLEANUP-003 : les six barres du faux funnel (`FunnelColumns`) → un
 * vrai stepper à paliers ; le CTA primaire brut → la frontière d'actions
 * Hearst. Le contrat de véracité, lui, est INCHANGÉ et reste verrouillé ici :
 * aucun moteur de dataviz en route, aucune copie d'API dans l'UI, composant
 * serveur, données jamais inventées.
 */

const root = (p: string) => resolve(import.meta.dirname, '../../', p)
const SOURCE = readFileSync(root('src/app/admin/dashboard/page.tsx'), 'utf8')
const HEADER = readFileSync(root('src/components/admin/dashboard/header.tsx'), 'utf8')
const KPI = readFileSync(root('src/components/admin/dashboard/kpi-grid.tsx'), 'utf8')
const STEPPER = readFileSync(root('src/components/admin/dashboard/subscription-journey.tsx'), 'utf8')
const QUEUE = readFileSync(root('src/components/admin/dashboard/action-queue.tsx'), 'utf8')
const ACTIONS = readFileSync(root('src/components/actions/hearst-actions.tsx'), 'utf8')
const BODY_NAV = readFileSync(root('src/components/admin/body-nav.tsx'), 'utf8')

describe('/admin/dashboard — structure (UI-ASSETS-005)', () => {
  it('uses Catalyst shell (no gray bag) and Heading header', () => {
    expect(SOURCE).toMatch(/<DashboardShell/)
    expect(SOURCE).toMatch(/<DashboardHeader/)
    expect(SOURCE).not.toMatch(/DashboardLightShell/)
    expect(SOURCE).not.toMatch(/bg-zinc-100/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
  })

  it('titles metadata as pilotage des souscriptions', () => {
    expect(SOURCE).toMatch(/title:\s*'Pilotage des souscriptions'/)
  })

  it('renders exactly four compact KPI cards without technical copy', () => {
    for (const label of [
      'Taux de conversion',
      'KYC en attente',
      'Souscriptions à traiter',
      'Souscriptions échouées',
    ]) {
      expect(SOURCE).toContain(label)
    }
    expect(SOURCE).toMatch(/<DashboardKpiGrid/)
    expect(SOURCE).not.toContain('proxy wallet')
    expect(SOURCE).not.toContain('Comptes présents dans le registre')
    expect(SOURCE).not.toContain('Clients actifs')
    expect(SOURCE).not.toContain('Wallets actifs')
    expect(KPI).not.toMatch(/En direct/)
    expect(KPI).not.toMatch(/SourcePill|AdminReading|showRoute/)
  })

  it('replaces the six-column funnel with a real journey stepper (no comparative bars)', () => {
    // La régression que la mission interdit : plus aucune barre comparative.
    expect(SOURCE).not.toMatch(/<FunnelColumns/)
    expect(SOURCE).toMatch(/<SubscriptionJourneyStepper/)
    expect(SOURCE).toContain('Parcours de souscription')
    // Le stepper est bâti sur Headless UI Tabs, pas sur des `role="meter"` (barres).
    expect(STEPPER).toMatch(/'use client'/)
    expect(STEPPER).toMatch(/TabGroup|TabList|TabPanel/)
    expect(STEPPER).not.toMatch(/role="meter"/)
    expect(STEPPER).not.toMatch(/height:\s*`?\$\{/)
    expect(STEPPER).toMatch(/data-widget="subscription-journey"/)
  })

  it('keeps actions in the priority queue and rebuilds it into a composition (not a blank card)', () => {
    expect(SOURCE).toMatch(/<ActionQueue/)
    expect(SOURCE).toContain('À traiter')
    // La zone « À traiter » porte un résumé + un panneau d'action + un empty honnête.
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
    // La primitive reste Catalyst : la frontière wrappe `<Button>`, ne le réécrit pas.
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
    // Le stepper marque l'état par tokens sémantiques (accent / warning / zinc), pas par arc-en-ciel.
    expect(STEPPER).not.toMatch(/bg-sky-|bg-violet-|bg-rose-|bg-orange-/)
    expect(STEPPER).toMatch(/accent-/)
  })

  it('keeps Portfolio secondary tabs visible on this page (no cul-de-sac)', () => {
    expect(BODY_NAV).not.toMatch(/pathname === '\/admin\/dashboard'[\s\S]*return null/)
    expect(BODY_NAV).toMatch(/sousMenusCorps/)
  })

  it('is a server component reading the shared registry', () => {
    expect(SOURCE).not.toMatch(/^'use client'/)
    expect(SOURCE).toContain('loadAdminRegistry')
    expect(SOURCE).toContain('requireSession')
    expect(SOURCE).not.toMatch(/Math\.random\(/)
  })
})
