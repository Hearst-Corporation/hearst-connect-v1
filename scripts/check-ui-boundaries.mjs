#!/usr/bin/env node
/**
 * Gate des frontières UI — verrouille ce que HC-UI-CONVERGENCE-001 a mis en place.
 *
 * Une convergence qui n'est pas gardée se défait : la prochaine page qui a
 * besoin d'une carte redéclarera sa `Card` locale, et on recommencera. Cette
 * gate transforme les quatre décisions d'architecture en règles vérifiables.
 *
 * ── Ce qui est vérifié ────────────────────────────────────────────────────
 *
 *  1. NO_DESIGN_LAB     — plus aucun import depuis `components/design-lab`.
 *                         Le code produit en est sorti ; le dossier n'existe
 *                         plus. Un import qui y revient est une régression.
 *
 *  2. NO_ENGINE_IN_ROUTE — une route (`src/app/**`) n'importe pas un moteur de
 *                         dataviz (`recharts`, `@mui/x-charts`). Elle importe
 *                         un chart de `components/charts`, qui décide seul de
 *                         son moteur. C'est ce qui rend un changement de
 *                         moteur possible sans toucher aux pages.
 *
 *  3. NO_LOCAL_PANEL    — une route ne redéclare pas une primitive de surface
 *                         (`Card`, `CardHeader`, `Panel`…) que les
 *                         compositions fournissent déjà. C'est exactement la
 *                         duplication que la mission a retirée : 10 `Card`,
 *                         7 `CardHeader`, 6 `HeroFigure`, 6 `SourceAttendue`.
 *
 *  4. NO_LOCAL_CATALYST — une route ne recrée pas une primitive générique
 *                         (`Button`, `Badge`, `Table`, `Dialog`…) que Catalyst
 *                         expose déjà (doctrine §2, niveau 1).
 *
 * ── Ce qui est délibérément NON vérifié ───────────────────────────────────
 * On ne cherche pas des noms « qui ressemblent à » une primitive : la règle ne
 * porte que sur des DÉCLARATIONS de composant (`function X(`) dont le nom est
 * dans une liste fermée. Une variable nommée `card`, un type `PanelTone`, une
 * fonction `renderCardRow` ne déclenchent rien. Une regex plus large casserait
 * au premier renommage sans rapport, et une gate qui crie à tort finit
 * désactivée.
 *
 * Usage : node scripts/check-ui-boundaries.mjs            (exit 1 si violation)
 *         node scripts/check-ui-boundaries.mjs --selftest (preuve qu'elle mord)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const R = '\x1b[31m'
const G = '\x1b[32m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd())
const SELFTEST = process.argv.includes('--selftest')

/** Primitives de surface fournies par `@/components/compositions`. */
const COMPOSITIONS = ['Card', 'CardHeader', 'CardBody', 'Panel', 'PanelHeader', 'PanelBody', 'HeroFigure', 'MetricValue', 'MetricCard', 'KpiRow', 'SideFact', 'SourceAttendue', 'CalmState', 'EmptyState']

/** Primitives génériques fournies par Catalyst (doctrine §2, niveau 1). */
const CATALYST = ['Button', 'Badge', 'Table', 'TableRow', 'TableCell', 'TableHead', 'TableHeader', 'TableBody', 'Dialog', 'Dropdown', 'Combobox', 'Listbox', 'Select', 'Checkbox', 'Radio', 'Switch', 'Textarea', 'Fieldset', 'Legend', 'Avatar', 'Pagination', 'Sidebar', 'Navbar']

/** Moteurs de dataviz : ils vivent derrière `components/charts`, jamais dans une route. */
const MOTEURS = ['recharts', '@mui/x-charts', '@mui/x-charts-pro']

const RULES = [
  {
    id: 'NO_DESIGN_LAB',
    scope: (rel) => rel.startsWith('src/'),
    test: (code) => {
      const m = code.match(/from\s+['"][^'"]*components\/design-lab[^'"]*['"]/g)
      return m ? m.map((s) => ({ extrait: s })) : []
    },
    message:
      "Import depuis `components/design-lab`. Le code produit en est sorti (HC-UI-CONVERGENCE-001) : la console vit dans `components/layout`, `features/`, `components/charts`.",
  },
  {
    id: 'NO_ENGINE_IN_ROUTE',
    scope: (rel) => rel.startsWith('src/app/'),
    test: (code) => {
      const trouves = []
      for (const moteur of MOTEURS) {
        const re = new RegExp(`from\\s+['"]${moteur.replace(/[/@]/g, '\\$&')}(?:/[^'"]*)?['"]`, 'g')
        for (const m of code.matchAll(re)) trouves.push({ extrait: m[0] })
      }
      return trouves
    },
    message:
      "Une route importe directement un moteur de dataviz. Passer par `@/components/charts` : la route décrit ce qu'elle montre, pas comment c'est dessiné.",
  },
  {
    id: 'NO_LOCAL_PANEL',
    scope: (rel) => rel.startsWith('src/app/'),
    test: (code) => {
      const trouves = []
      for (const nom of COMPOSITIONS) {
        const re = new RegExp(`^\\s*(?:export\\s+)?function ${nom}\\s*\\(`, 'gm')
        for (const m of code.matchAll(re)) trouves.push({ extrait: `function ${nom}(` })
      }
      return trouves
    },
    message:
      'Une route redéclare une primitive de surface locale. Ces contrats vivent dans `@/components/compositions` — les recopier est la duplication que la convergence a retirée.',
  },
  {
    id: 'NO_LOCAL_CATALYST',
    scope: (rel) => rel.startsWith('src/app/') || rel.startsWith('src/features/'),
    test: (code) => {
      const trouves = []
      for (const nom of CATALYST) {
        const re = new RegExp(`^\\s*(?:export\\s+)?function ${nom}\\s*\\(`, 'gm')
        for (const m of code.matchAll(re)) trouves.push({ extrait: `function ${nom}(` })
      }
      return trouves
    },
    message:
      'Une primitive générique est recréée à la main alors que Catalyst la fournit (doctrine §2, niveau 1). Vérifier `src/components/catalyst/VENDOR.md` avant d’en écrire une.',
  },
]

/** Retire commentaires et chaînes : une règle citée en prose n'est pas une violation. */
function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let stats
    try {
      stats = statSync(full)
    } catch {
      continue
    }
    if (stats.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

function analyser(rel, source) {
  const code = strip(source)
  const violations = []
  for (const rule of RULES) {
    if (!rule.scope(rel)) continue
    for (const t of rule.test(code)) {
      const idx = code.indexOf(t.extrait)
      const line = idx === -1 ? 0 : code.slice(0, idx).split('\n').length
      violations.push({ file: rel, line, rule, extrait: t.extrait })
    }
  }
  return violations
}

/* ── Self-test ────────────────────────────────────────────────────────────── */

if (SELFTEST) {
  const cas = [
    {
      nom: 'route qui redéclare une Card locale',
      rel: 'src/app/admin/x/page.tsx',
      code: "function Card({ children }) {\n  return <div>{children}</div>\n}\n",
      attendu: 'NO_LOCAL_PANEL',
    },
    {
      nom: 'route qui importe recharts directement',
      rel: 'src/app/admin/x/page.tsx',
      code: "import { AreaChart } from 'recharts'\n",
      attendu: 'NO_ENGINE_IN_ROUTE',
    },
    {
      nom: 'import depuis design-lab',
      rel: 'src/components/x.tsx',
      code: "import { Panel } from '@/components/design-lab/legacy/primitives'\n",
      attendu: 'NO_DESIGN_LAB',
    },
    {
      nom: 'primitive Catalyst recréée',
      rel: 'src/app/admin/x/page.tsx',
      code: "function Button({ children }) {\n  return <button>{children}</button>\n}\n",
      attendu: 'NO_LOCAL_CATALYST',
    },
  ]

  const negatifs = [
    {
      nom: 'route conforme (composition importée, chart via la frontière)',
      rel: 'src/app/admin/x/page.tsx',
      code:
        "import { Panel, PanelHeader } from '@/components/compositions'\n" +
        "import { ChartFrame } from '@/components/charts'\n" +
        'export default function Page() {\n  return <Panel><PanelHeader title="T" /></Panel>\n}\n',
    },
    {
      nom: 'nom qui ressemble mais n’est pas une déclaration de primitive',
      rel: 'src/app/admin/x/page.tsx',
      code: 'function renderCardRow(x) {\n  const card = x\n  return card\n}\n',
    },
    {
      nom: 'un chart PEUT importer son moteur (il est derrière la frontière)',
      rel: 'src/components/charts/cartesian/y.tsx',
      code: "import { AreaChart } from 'recharts'\n",
    },
    {
      nom: 'la prose qui cite la règle ne la déclenche pas',
      rel: 'src/app/admin/x/page.tsx',
      code: "// ne jamais écrire function Card( ici\n/* import ... from 'recharts' */\n",
    },
  ]

  let ok = true
  console.log(`\n${B}check-ui-boundaries --selftest${X}\n`)
  console.log(`${D}  fixtures positives (doivent MORDRE)${X}`)
  for (const c of cas) {
    const v = analyser(c.rel, c.code)
    const trouve = v.some((x) => x.rule.id === c.attendu)
    ok = ok && trouve
    console.log(`    ${c.nom} → ${trouve ? G + c.attendu : R + 'NON DÉTECTÉ'}${X}`)
  }
  console.log(`\n${D}  fixtures négatives (doivent PASSER)${X}`)
  for (const c of negatifs) {
    const v = analyser(c.rel, c.code)
    const propre = v.length === 0
    ok = ok && propre
    console.log(
      `    ${c.nom} → ${propre ? G + 'OK' : R + 'FAUX POSITIF: ' + v.map((x) => x.rule.id).join(', ')}${X}`,
    )
  }
  console.log()
  process.exit(ok ? 0 : 1)
}

/* ── Analyse réelle ───────────────────────────────────────────────────────── */

const fichiers = walk(join(ROOT, 'src')).filter((f) => !/\.(test|spec)\.tsx?$/.test(f))
const violations = []
for (const f of fichiers) {
  const rel = relative(ROOT, f).split('\\').join('/')
  violations.push(...analyser(rel, readFileSync(f, 'utf8')))
}

console.log(`\n${B}check-ui-boundaries${X}  ${D}${fichiers.length} fichiers · ${RULES.length} règles${X}\n`)

if (violations.length === 0) {
  console.log(`${G}${B}✓ Frontières UI respectées.${X}`)
  console.log(`${D}  Catalyst → compositions → modules métier → routes.${X}\n`)
  process.exit(0)
}

for (const v of violations) {
  console.log(`${R}✗ ${v.rule.id}${X}  ${v.file}:${v.line}`)
  console.log(`  ${v.rule.message}`)
  console.log(`  ${D}${v.extrait}${X}\n`)
}
console.log(`${R}${B}✗ ${violations.length} violation(s) de frontière.${X}\n`)
process.exit(1)
