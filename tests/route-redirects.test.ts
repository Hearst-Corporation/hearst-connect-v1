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

  it('/espace-utilisateur redirects to /account', () => {
    const source = pageSource('src/app/espace-utilisateur/page.tsx')
    expect(source).toMatch(/redirect\(['"]\/account['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })

  it.each([
    ['/espace/dashboard', 'src/app/espace/dashboard/page.tsx'],
    ['/espace/activite', 'src/app/espace/activite/page.tsx'],
    ['/espace/profil', 'src/app/espace/profil/page.tsx'],
    ['/espace/bitcoin', 'src/app/espace/bitcoin/page.tsx'],
    ['/account/dashboard', 'src/app/account/dashboard/page.tsx'],
    ['/account/activity', 'src/app/account/activity/page.tsx'],
    ['/account/profile', 'src/app/account/profile/page.tsx'],
    ['/account/bitcoin', 'src/app/account/bitcoin/page.tsx'],
  ] as const)('%s redirects to /account', (_route, file) => {
    const source = pageSource(file)
    expect(source).toMatch(/redirect\(['"]\/account['"]\)/)
    expect(source).not.toMatch(/<[A-Z]/)
  })
})
