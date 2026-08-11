import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * English product language contract (HC-FRONTEND-ENGLISH-ONLY-008).
 *
 * The console renders in English. This test reads active admin routes and the
 * shell that wraps them — not a single dead component.
 */

const ROOT = resolve(import.meta.dirname, '..')
const ADMIN_APP = join(ROOT, 'src/app/admin')
const ADMIN_COMPONENTS = join(ROOT, 'src/components/admin')
const CONSOLE_LAYOUT = join(ROOT, 'src/components/layout')
const VAULT_COMPONENTS = join(ROOT, 'src/components/vaults')
const ACCOUNT_APP = join(ROOT, 'src/app/account')

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const ADMIN_SOURCES = [...walk(ADMIN_APP), ...walk(ADMIN_COMPONENTS), ...walk(CONSOLE_LAYOUT), ...walk(VAULT_COMPONENTS)].map(
  (file) => ({ path: relative(ROOT, file), code: readFileSync(file, 'utf8') }),
)

const ACCOUNT_SOURCES = walk(ACCOUNT_APP).map((file) => ({
  path: relative(ROOT, file),
  code: readFileSync(file, 'utf8'),
}))

const PAGE_FILES = ADMIN_SOURCES.filter(({ path }) => /src\/app\/admin\/.*\/page\.tsx$/.test(path) || /src\/app\/admin\/page\.tsx$/.test(path))

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

describe('the console is in English', () => {
  it('the root document declares lang="en"', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')
    expect(layout).toMatch(/lang="en"/)
  })

  it('primary navigation labels are in English', () => {
    const layout = stripComments(
      readFileSync(join(ADMIN_COMPONENTS, 'application-layout.tsx'), 'utf8'),
    )
    const nav = stripComments(readFileSync(join(ROOT, 'src/lib/admin-nav.ts'), 'utf8'))
    expect(nav).toMatch(/label: 'Dashboard'/)
    expect(nav).toMatch(/label: 'Compliance'/)
    expect(nav).toMatch(/label: 'Operations'/)
    expect(layout).toMatch(/Sign out/)
    expect(nav).not.toMatch(/label: 'Tableau de bord'/)
    expect(layout).not.toMatch(/Se déconnecter/)
  })

  it('shared status labels are in English', () => {
    const truthful = readFileSync(join(ADMIN_COMPONENTS, 'truthful.tsx'), 'utf8')
    expect(truthful).toMatch(/LIVE: 'Live'/)
    expect(truthful).toMatch(/UNAVAILABLE: 'Unavailable'/)
    expect(truthful).toMatch(/NOT_CONFIGURED: 'Not configured'/)
    expect(truthful).toMatch(/UNAVAILABLE:/)
  })

  it('account hub uses English chrome without invented destinations', () => {
    const dashboard = readFileSync(join(ROOT, 'src/features/user-dashboard/user-dashboard.tsx'), 'utf8')
    const page = readFileSync(join(ROOT, 'src/app/account/page.tsx'), 'utf8')
    expect(page).toMatch(/UserDashboardView/)
    expect(dashboard).toMatch(/Sign out/)
    expect(dashboard).toMatch(/Command center/)
    expect(dashboard).not.toMatch(/\/espace/)
    expect(dashboard).not.toMatch(/Se déconnecter/)
    expect(dashboard).not.toMatch(/ADMIN_NAV/)
    expect(dashboard).not.toMatch(/Bitcoin production/)
  })
})

describe('forbidden French UI copy does not return', () => {
  const FORBIDDEN_UI = [
    '>Se déconnecter<',
    '>Tableau de bord<',
    '>Conformité<',
    '>Indisponible<',
    '>Joignable<',
    '>Chargement…<',
    '>Réessayer<',
    '>Demander un accès<',
    '>Se connecter<',
    '>Votre compte<',
    '>Accéder à la console<',
    "lang=\"fr\"",
    'libelle: \'Tableau de bord\'',
    "LIVE: 'En direct'",
    "UNAVAILABLE: 'Indisponible'",
  ]

  it.each(FORBIDDEN_UI)('admin shell does not contain "%s"', (phrase) => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => stripComments(code).includes(phrase)).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it.each(['>Indisponible<', '>Tableau de bord<', '>Se déconnecter<'])(
    'account pages do not contain "%s"',
    (phrase) => {
      const offenders = ACCOUNT_SOURCES.filter(({ code }) => stripComments(code).includes(phrase)).map((f) => f.path)
      expect(offenders).toEqual([])
    },
  )
})

describe('technical codes stay unchanged', () => {
  it('backend status codes in UPPERCASE are preserved', () => {
    const truthful = readFileSync(join(ADMIN_COMPONENTS, 'truthful.tsx'), 'utf8')
    for (const code of ['LIVE', 'STALE', 'PARTIAL', 'EMPTY', 'UNAVAILABLE', 'NOT_CONFIGURED', 'ERROR']) {
      expect(truthful).toMatch(new RegExp(`${code}:`))
    }
  })
})

describe('no locale-aware fr-FR formatters', () => {
  it('never calls a locale-aware formatter with fr-FR', () => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => code.includes("'fr-FR'") || code.includes('"fr-FR"')).map(
      (f) => f.path,
    )
    expect(offenders).toEqual([])
  })
})

describe('one canonical H1 per page', () => {
  it('no admin file renders a raw <h1> outside the typography module', () => {
    const H1_EXEMPTIONS = new Set(['src/components/admin/typography.tsx'])
    const offenders = ADMIN_SOURCES.filter(
      ({ path, code }) => !H1_EXEMPTIONS.has(path) && /<h1[\s>]/.test(code),
    ).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('a redirect-only route redirects and renders nothing else', () => {
    const redirects = PAGE_FILES.filter(({ code }) => /^\s*redirect\(/m.test(code))
    for (const { path, code } of redirects) {
      expect(code, `${path} redirects, so it must not also render JSX`).not.toMatch(/<[A-Z]/)
    }
  })
})

describe('no legacy Qatar design vocabulary', () => {
  it('the string "Qatar" does not appear anywhere under src/', () => {
    const SRC = join(ROOT, 'src')
    const allSources = walk(SRC).map((file) => ({ path: relative(ROOT, file), code: readFileSync(file, 'utf8') }))
    const offenders = allSources.filter(({ code }) => /qatar/i.test(code)).map((f) => f.path)
    expect(offenders).toEqual([])
  })
})

describe('language guard fixtures', () => {
  const contains = (code: string, phrase: string) => stripComments(code).includes(phrase)

  it('English fixture passes', () => {
    const ok = `<h2>Data coverage</h2><span>{STATUS.UNAVAILABLE}</span><p>Chain ID : 31337</p>`
    expect(contains(ok, '>Indisponible<')).toBe(false)
    expect(contains(ok, '>Tableau de bord<')).toBe(false)
    expect(ok).toContain('Chain ID')
  })

  it('French UI fixture is detectable', () => {
    const bad = `<button>Se déconnecter</button>`
    expect(contains(bad, 'Se déconnecter')).toBe(true)
  })
})
