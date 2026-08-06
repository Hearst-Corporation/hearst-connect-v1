import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural contract for `/admin/dashboard` (HC-ADMIN-DASHBOARD-PILOTAGE-001).
 *
 * A full server-component render (session + backend fetch) is not this
 * codebase's pattern for whole pages — pure derivations and compositions get
 * unit tests (`tests/vaults/pilotage.test.ts`,
 * `tests/compositions/funnel-and-priority-queue.test.tsx`); a full route gets
 * real browser validation (mission §16). This test guards the STATIC
 * contract the mission requires of the page's source — the shape a runtime
 * render cannot silently regress without also failing here.
 */

const PAGE_PATH = resolve(import.meta.dirname, '../../src/app/admin/dashboard/page.tsx')
const SOURCE = readFileSync(PAGE_PATH, 'utf8')

describe('/admin/dashboard structure', () => {
  it('renders exactly one page header (one H1) via AdminPageHeader', () => {
    const matches = SOURCE.match(/<AdminPageHeader/g) ?? []
    expect(matches.length).toBe(1)
    // No competing top-level Heading — AdminPageHeader is the only H1 source.
    expect(SOURCE).not.toMatch(/<Heading[\s>]/)
  })

  it('titles the cockpit "Pilotage des souscriptions", matching the mission brief', () => {
    expect(SOURCE).toMatch(/title="Pilotage des souscriptions"/)
    expect(SOURCE).toMatch(/title:\s*'Pilotage des souscriptions'/)
  })

  it('renders the KPI row required by the mission (6 tiles minimum)', () => {
    const statCards = SOURCE.match(/<StatCard\b/g) ?? []
    expect(statCards.length).toBeGreaterThanOrEqual(6)
    for (const label of [
      'Clients actifs',
      'KYC à traiter',
      'Wallets à créer',
      'Dépôts',
      'Souscriptions en attente',
      'Transactions en erreur',
    ]) {
      expect(SOURCE).toContain(label)
    }
  })

  it('renders the funnel as the dominant visual — never a donut', () => {
    expect(SOURCE).toMatch(/<FunnelPipeline/)
    expect(SOURCE).not.toMatch(/donut|PieChart/i)
  })

  it('renders the priority queue ("À traiter maintenant")', () => {
    expect(SOURCE).toMatch(/<PriorityQueue/)
    expect(SOURCE).toContain('À traiter maintenant')
  })

  it('renders the three operational queues the mission requires', () => {
    expect(SOURCE).toContain('File KYC')
    expect(SOURCE).toContain('Wallets et coffres')
    expect(SOURCE).toContain('Souscriptions et transactions')
  })

  it('renders the activity and distribution charts through the chart boundary only', () => {
    expect(SOURCE).toMatch(/<ChartFrame/)
    expect(SOURCE).not.toMatch(/from ['"]recharts['"]/)
    expect(SOURCE).not.toMatch(/from ['"]@mui\/x-charts/)
  })

  it('never hides a module with display:none — every SectionCard/DataTableShell/ChartFrame stays mounted', () => {
    // Table rows and chart children may legitimately render nothing when a
    // list is empty (the wrapper — DataTableShell / ChartFrame — still
    // renders its named placeholder via `calme` / `source` / `etat`); what
    // must never happen is a whole module's frame disappearing.
    expect(SOURCE).not.toMatch(/display:\s*none/)
    expect(SOURCE).not.toMatch(/display:\s*['"]none['"]/)
    // Every table module supplies its named-absence contract instead of
    // vanishing: `calme` (empty-but-live) or `source` (source unavailable).
    const dataTableShells = SOURCE.match(/<DataTableShell/g) ?? []
    const calmeProps = SOURCE.match(/calme=\{/g) ?? []
    expect(calmeProps.length).toBe(dataTableShells.length)
  })

  it('offers the "Ajouter un client" primary action to a real, registered route', () => {
    expect(SOURCE).toContain('Ajouter un client')
    expect(SOURCE).toContain('/admin/client-simulator/new')
  })

  it('links to the operational pages the mission names — clients, conformité, coffres, opérations', () => {
    for (const href of ['/admin/clients', '/admin/conformite', '/admin/vaults', '/admin/operations']) {
      expect(SOURCE).toContain(href)
    }
  })

  it('is a server component reading the shared registry — no client-side data fetching', () => {
    expect(SOURCE).not.toMatch(/^'use client'/)
    expect(SOURCE).toContain('loadAdminRegistry')
    expect(SOURCE).toContain('requireSession')
  })
})
