import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ADMIN_PAGE = resolve(import.meta.dirname, '../../src/app/admin/page.tsx')
const LEGACY_PAGE = resolve(import.meta.dirname, '../../src/app/admin/dashboard/page.tsx')

describe('URLs tableau de bord', () => {
  it('/admin rend le dashboard unique', () => {
    const source = readFileSync(ADMIN_PAGE, 'utf8')
    expect(source).toContain("from '@/features/admin-dashboard/admin-dashboard-page'")
    expect(source).toContain('<AdminDashboardPage')
    expect(source).toContain('loadAdminRegistry')
    expect(source).toContain('requireSession')
    expect(source).not.toMatch(/AdminHomeDashboard/)
  })

  it('/admin/dashboard redirige vers /admin', () => {
    const source = readFileSync(LEGACY_PAGE, 'utf8')
    expect(source).toMatch(/redirect\(['"]\/admin['"]\)/)
  })
})
