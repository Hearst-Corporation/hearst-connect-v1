import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ADMIN_PAGE = resolve(import.meta.dirname, '../../src/app/admin/page.tsx')
const LEGACY_PAGE = resolve(import.meta.dirname, '../../src/app/admin/dashboard/page.tsx')

describe('dashboard URLs', () => {
  it('/admin renders the unique dashboard', () => {
    const source = readFileSync(ADMIN_PAGE, 'utf8')
    expect(source).toContain("from '@/features/admin-dashboard/admin-dashboard-page'")
    expect(source).toContain('<AdminDashboardPage')
    // Thin route: panels stream their own cached read models — no blocking load here.
    expect(source).not.toContain('loadAdminDashboard')
    expect(source).not.toContain('loadAdminRegistry')
    expect(source).toContain('requireSession')
    expect(source).not.toMatch(/AdminHomeDashboard/)
  })

  it('/admin/dashboard redirects to /admin', () => {
    const source = readFileSync(LEGACY_PAGE, 'utf8')
    expect(source).toMatch(/redirect\(['"]\/admin['"]\)/)
  })
})
