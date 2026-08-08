import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')

function pageSource(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8')
}

describe('French legacy routes redirect to English canonical routes', () => {
  it('/admin/conformite redirects to /admin/compliance', () => {
    const source = pageSource('src/app/admin/conformite/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/admin\/compliance['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/admin/produit redirects to /admin/product', () => {
    const source = pageSource('src/app/admin/produit/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/admin\/product['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/admin/administration/produit redirects to /admin/product', () => {
    const source = pageSource('src/app/admin/administration/produit/page.tsx')
    expect(source).toMatch(/redirectToProduct\(\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/espace redirects to /account', () => {
    const source = pageSource('src/app/espace/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/espace/dashboard redirects to /account/dashboard', () => {
    const source = pageSource('src/app/espace/dashboard/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account\/dashboard['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/espace/activite redirects to /account/activity', () => {
    const source = pageSource('src/app/espace/activite/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account\/activity['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/espace/profil redirects to /account/profile', () => {
    const source = pageSource('src/app/espace/profil/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account\/profile['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it('/espace/bitcoin redirects to /account/bitcoin', () => {
    const source = pageSource('src/app/espace/bitcoin/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account\/bitcoin['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })
})
