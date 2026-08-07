import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contrat de langue de la console (mission HC-CONSOLE-FR-001).
 *
 * La langue produit est le français (HC-CONSOLE-FR-001). Ce test
 * a été INVERSÉ : il imposait l'anglais (mission HC-UI-NORMALIZATION-001), il
 * impose désormais le français sur les surfaces réellement rendues et interdit
 * la réapparition des anciens libellés anglais d'interface.
 *
 * Il ne se contente pas d'un grep sur un composant mort : il lit les sources
 * des ROUTES ADMIN ACTIVES et du shell qui les habille.
 */

const ROOT = resolve(import.meta.dirname, '..')
const ADMIN_APP = join(ROOT, 'src/app/admin')
const ADMIN_COMPONENTS = join(ROOT, 'src/components/admin')
const CONSOLE_LAYOUT = join(ROOT, 'src/components/layout')
const ADMIN_HOME = join(ROOT, 'src/features/admin-home')
const VAULT_COMPONENTS = join(ROOT, 'src/components/vaults')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const ADMIN_SOURCES = [...walk(ADMIN_APP), ...walk(ADMIN_COMPONENTS), ...walk(CONSOLE_LAYOUT), ...walk(ADMIN_HOME), ...walk(VAULT_COMPONENTS)].map(
  (file) => ({ path: relative(ROOT, file), code: readFileSync(file, 'utf8') }),
)

const PAGE_FILES = ADMIN_SOURCES.filter(({ path }) => /src\/app\/admin\/.*\/page\.tsx$/.test(path) || /src\/app\/admin\/page\.tsx$/.test(path))

/**
 * Retire commentaires et JSDoc : un commentaire de code reste en anglais (il
 * s'adresse au développeur, pas à l'utilisateur) et ne doit pas déclencher la
 * garde. Seul le TEXTE rendu compte.
 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

/* ── 1. Le français est la langue produit ─────────────────────────────────── */

describe('la console est en français', () => {
  it('le document racine déclare lang="fr"', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')
    expect(layout).toMatch(/lang="fr"/)
  })

  it('la navigation principale est en français', () => {
    // Shell Catalyst admin — destinations via ADMIN_NAV + libellés du layout.
    const layout = stripComments(
      readFileSync(join(ADMIN_COMPONENTS, 'application-layout.tsx'), 'utf8'),
    )
    const nav = stripComments(readFileSync(join(ROOT, 'src/lib/admin-nav.ts'), 'utf8'))
    expect(nav).toMatch(/libelle: 'Cockpit'/)
    expect(nav).toMatch(/libelle: 'Conformité'/)
    expect(nav).toMatch(/libelle: 'Opérations'/)
    expect(layout).toMatch(/Se déconnecter/)
    expect(nav).not.toMatch(/libelle: 'Home'/)
    expect(layout).not.toMatch(/>Sign out</)
  })

  it('les libellés de statut partagés sont en français', () => {
    const truthful = readFileSync(join(ADMIN_COMPONENTS, 'truthful.tsx'), 'utf8')
    expect(truthful).toMatch(/LIVE: 'En direct'/)
    expect(truthful).toMatch(/UNAVAILABLE: 'Indisponible'/)
    expect(truthful).toMatch(/NOT_CONFIGURED: 'Non configuré'/)
    // La CLÉ technique (le code de statut) reste inchangée : véracité préservée.
    expect(truthful).toMatch(/UNAVAILABLE:/)
  })
})

/* ── 2. Interdire la réapparition des anciens libellés anglais d'interface ── */

describe('aucun ancien libellé anglais d’interface', () => {
  // Libellés d'UI (pas des identifiants techniques) qui étaient rendus en
  // anglais et doivent désormais être français partout dans les sources admin.
  // On matche le libellé ENTRE BALISES ou EN CHAÎNE d'affichage, pas un mot
  // isolé qui pourrait être un identifiant technique.
  const FORBIDDEN_UI = [
    '>Sign out<',
    '>Home<',
    '>Data coverage<',
    '>Served<',
    '>Movements<',
    '>Runs<',
    '>Reserve split<',
    '>Curve points<',
    '>Total endpoints<',
    '>Active vaults<',
    '>Vault registry<',
    "label=\"Hearst Connect data coverage cockpit\"",
    'Loading surface',
    'Try again',
    'Waiting on the source',
    'Data unavailable',
  ]

  it.each(FORBIDDEN_UI)('ne contient plus le libellé anglais "%s"', (phrase) => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => stripComments(code).includes(phrase)).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('aucun label de shell « cockpit » anglais ne subsiste', () => {
    const offenders = ADMIN_SOURCES.filter(({ code }) => /label="Hearst Connect [a-z].* cockpit"/.test(stripComments(code))).map(
      (f) => f.path,
    )
    expect(offenders).toEqual([])
  })
})

/* ── 3. Identifiants techniques CONSERVÉS (véracité) ──────────────────────── */

describe('les codes techniques restent inchangés', () => {
  it('les codes de statut backend en MAJUSCULES sont préservés', () => {
    const truthful = readFileSync(join(ADMIN_COMPONENTS, 'truthful.tsx'), 'utf8')
    // Les clés du map de statut sont les codes techniques, non traduits.
    for (const code of ['LIVE', 'STALE', 'PARTIAL', 'EMPTY', 'UNAVAILABLE', 'NOT_CONFIGURED', 'ERROR']) {
      expect(truthful).toMatch(new RegExp(`${code}:`))
    }
  })
})

/* ── 4. Règles structurelles conservées de la mission précédente ──────────── */

describe('pas de formateur locale-aware fr-FR (le format reste neutre)', () => {
  it('never calls a locale-aware formatter with fr-FR', () => {
    // La langue de l'INTERFACE est le français, mais les NOMBRES restent
    // formatés en locale neutre pour éviter des séparateurs ambigus dans les
    // tableaux financiers. C'est une règle de format, pas de langue.
    const offenders = ADMIN_SOURCES.filter(({ code }) => code.includes("'fr-FR'") || code.includes('"fr-FR"')).map(
      (f) => f.path,
    )
    expect(offenders).toEqual([])
  })
})

describe('un seul H1 canonique par page', () => {
  it('no admin file renders a raw <h1> outside the typography module', () => {
    // Le shell green rend un <h1 className={gcc.srOnly}> délibéré : le titre de
    // niveau 1 est masqué visuellement (sr-only) mais nécessaire au plan du
    // document pour les lecteurs d'écran. C'est une exception documentée.
    const H1_EXEMPTIONS = new Set([
      'src/components/admin/typography.tsx',
      'src/components/layout/console-shell.tsx',
    ])
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

describe('no undocumented negative chart margins', () => {
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

/* ── 5. Fixtures : la garde de langue MORD (positive et négative) ──────────── */

describe('la garde de langue mord (fixtures)', () => {
  const contains = (code: string, phrase: string) => stripComments(code).includes(phrase)

  it('fixture conforme (français + code technique) passe', () => {
    const ok = `<h2>Couverture des données</h2><span>{STATUS.UNAVAILABLE}</span><p>Chain ID : 31337</p>`
    expect(contains(ok, '>Sign out<')).toBe(false)
    expect(contains(ok, '>Home<')).toBe(false)
    // « Chain ID » et « 31337 » sont des identifiants techniques : autorisés.
    expect(ok).toContain('Chain ID')
  })

  it('fixture avec un ancien H1 anglais est détectable', () => {
    const bad = `<button>Sign out</button>`
    expect(contains(bad, '>Sign out<') || bad.includes('Sign out')).toBe(true)
  })
})
