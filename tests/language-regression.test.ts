import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regression guards for the admin UI normalization + English migration
 * mission (HC-UI-NORMALIZATION-001). Each rule here failed before the
 * mission and must never silently regress after it.
 */

const ROOT = resolve(import.meta.dirname, '..')
const ADMIN_APP = join(ROOT, 'src/app/admin')
const ADMIN_COMPONENTS = join(ROOT, 'src/components/admin')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const ADMIN_SOURCES = [...walk(ADMIN_APP), ...walk(ADMIN_COMPONENTS)].map((file) => ({
  path: relative(ROOT, file),
  code: readFileSync(file, 'utf8'),
}))

const PAGE_FILES = ADMIN_SOURCES.filter(({ path }) => /\/page\.tsx$/.test(path))

describe('no fr-FR locale in admin presentation code', () => {
  it('never calls a locale-aware formatter with fr-FR', () => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => code.includes("'fr-FR'") || code.includes('"fr-FR"')).map(
      (f) => f.path,
    )
    expect(offenders).toEqual([])
  })
})

describe('no forbidden French UI phrases', () => {
  // A representative sample of the French vocabulary this mission removed —
  // not exhaustive, but catches the common relapse cases (empty/loading/
  // unavailable states, the old nav/shell copy).
  const FORBIDDEN = [
    'Aucun',
    'Aucune',
    'Chargement',
    'Indisponible',
    'Se déconnecter',
    'Management Cockpit',
    'Vue d’ensemble',
    "Vue d'ensemble",
    'Équipe',
    'Source attendue',
  ]

  it.each(FORBIDDEN)('does not contain "%s"', (phrase) => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => code.includes(phrase)).map((f) => f.path)
    expect(offenders).toEqual([])
  })
})

describe('single canonical page-heading component', () => {
  it('every admin route renders PageHeader exactly once (one H1 per page)', () => {
    // A route that only redirects renders no document, so it has no H1 to own.
    // `/admin/vault` became one when the console moved to the vault registry:
    // planting a <PageHeader> there to satisfy this grep would be dead JSX
    // shipped to production for a test's benefit.
    const rendersADocument = ({ code }: { code: string }) =>
      !/^\s*redirect\(/m.test(code) || /<PageHeader\b/.test(code)

    const offenders = PAGE_FILES.filter(rendersADocument)
      .filter(({ code }) => (code.match(/<PageHeader\b/g) ?? []).length !== 1)
      .map((f) => `${f.path} (${(f.code.match(/<PageHeader\b/g) ?? []).length} usages)`)
    expect(offenders).toEqual([])
  })

  it('a redirect-only route redirects and renders nothing else', () => {
    // The exemption above is only safe while such a route really is a redirect
    // and nothing more — otherwise it becomes a hole a whole page could hide in.
    const redirects = PAGE_FILES.filter(({ code }) => /^\s*redirect\(/m.test(code))
    for (const { path, code } of redirects) {
      expect(code, `${path} redirects, so it must not also render JSX`).not.toMatch(/<[A-Z]/)
    }
  })

  it('no admin file renders a raw <h1> outside the typography module', () => {
    const offenders = ADMIN_SOURCES.filter(
      ({ path, code }) => path !== 'src/components/admin/typography.tsx' && /<h1[\s>]/.test(code),
    ).map((f) => f.path)
    expect(offenders).toEqual([])
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

describe('no undocumented negative chart margins', () => {
  // A negative Recharts margin is legitimate when it offsets Recharts' own
  // reserved axis space (documented inline) — it becomes a regression only
  // when it reappears with no explanation, which usually means it's
  // papering over a layout bug instead of a real constraint.
  it('every negative margin value is explained by a nearby comment', () => {
    const offenders: string[] = []
    for (const { path, code } of ADMIN_SOURCES) {
      const lines = code.split('\n')
      lines.forEach((line, i) => {
        if (!/-\s*\d+\s*,?\s*$|:\s*-\d+/.test(line) || !/(top|right|bottom|left)\s*:\s*-\d/.test(line)) return
        const window = lines.slice(Math.max(0, i - 4), i + 1).join('\n')
        if (!/\/\/|\/\*/.test(window)) offenders.push(`${path}:${i + 1}`)
      })
    }
    expect(offenders).toEqual([])
  })
})
