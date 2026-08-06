import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Accueil `/admin` is the patrimoine cockpit again — not a redirect to
 * `/admin/dashboard` (pilotage souscriptions lives on its own route).
 */
const PAGE_PATH = resolve(import.meta.dirname, '../../src/app/admin/page.tsx')
const SOURCE = readFileSync(PAGE_PATH, 'utf8')

describe('/admin', () => {
  it('renders AdminHomeDashboard — no redirect to pilotage', () => {
    expect(SOURCE).toContain("from '@/features/admin-home/admin-home-dashboard'")
    expect(SOURCE).toContain('<AdminHomeDashboard')
    expect(SOURCE).toContain('loadAdminRegistry')
    expect(SOURCE).toContain('requireSession')
    expect(SOURCE).not.toMatch(/redirect\(/)
    expect(SOURCE).not.toMatch(/redirect\(['"]\/admin\/dashboard['"]\)/)
  })
})
