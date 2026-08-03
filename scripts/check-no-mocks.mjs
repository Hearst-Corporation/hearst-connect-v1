#!/usr/bin/env node
/**
 * Gate anti-mock — échoue si du contenu simulé réapparaît dans le runtime.
 *
 * Ce que le gate cherche vraiment : des données inventées rendues à l'écran.
 * Il ne cherche pas des noms de variables, sinon la moindre prose d'un
 * commentaire (« ne jamais utiliser de mock ») le ferait échouer et il serait
 * désactivé dans la semaine.
 *
 * Périmètre : src/app, src/components, src/features, src/hooks, src/lib,
 * src/services. Les tests sont exclus — un mock y est légitime tant qu'aucun
 * fichier runtime ne l'importe, ce que la règle IMPORT_FROM_TESTS vérifie.
 *
 * Usage : node scripts/check-no-mocks.mjs   (exit 1 si violation)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(process.argv[2] ?? process.cwd())
const SCAN = ['src/app', 'src/components', 'src/features', 'src/hooks', 'src/lib', 'src/services']

const R = '\x1b[31m'
const G = '\x1b[32m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

/** Un fichier de test : mocks tolérés, jamais importables depuis le runtime. */
const IS_TEST = /\.(test|spec)\.(ts|tsx)$/
const IS_TEST_DIR = /(^|\/)(__tests__|__mocks__|__fixtures__)(\/|$)/

const RULES = [
  {
    id: 'RANDOM',
    // Une donnée affichée ne se tire pas au sort.
    pattern: /\bMath\.random\s*\(/g,
    message: 'Math.random() dans le runtime — une valeur affichée ne peut pas être tirée au hasard.',
  },
  {
    id: 'FAKER',
    pattern: /\bfrom\s+['"]@?faker[^'"]*['"]|\brequire\(['"]@?faker/g,
    message: 'Dépendance faker importée dans le runtime.',
  },
  {
    id: 'IMPORT_FROM_TESTS',
    // La fuite classique : une page qui importe une fixture de test.
    pattern: /\bfrom\s+['"][^'"]*(__mocks__|__fixtures__|\.fixtures?|mock-data|mockData|demo-data|demoData|sample-data|seed-data|testData)[^'"]*['"]/g,
    message: 'Import d’une fixture ou d’un jeu de démonstration depuis un fichier runtime.',
  },
  {
    id: 'DECLARED_FIXTURE',
    // Une constante qui s'annonce elle-même comme fausse donnée.
    pattern: /\b(?:const|let|var)\s+\w*(?:mockData|mock[A-Z]\w*|fixtures?|demoData|sampleData|fakeData|dummyData|seedData|staticData|testData|previewData|placeholderData|fallbackData|defaultData|initialData|chartData|generateSeries|generateData)\w*\s*[:=]/g,
    message: 'Déclaration d’un jeu de données simulé dans le runtime.',
  },
  {
    id: 'NULL_TO_ZERO',
    // Le mensonge le plus discret : une absence rendue comme un zéro.
    pattern: /\?\?\s*0\b(?!\s*\.)|\|\|\s*0\b(?!\s*\.)/g,
    message: 'Coalescence vers 0 : une valeur absente ne vaut pas zéro (utiliser formatCount / « — »).',
  },
  {
    id: 'FORCED_AVAILABLE',
    // VER-10 : un objet Availability construit à la main avec kind:'available'
    // + provenance:'manual' force n'importe quelle chaîne à l'état « disponible »
    // (badgé « Live »). C'est LA cause racine des P0 de véracité. Le seul
    // constructeur légitime est `editorial()` / `available()` de vaults/model.
    // NB : `strip()` a déjà vidé les littéraux, donc on matche les NOMS de
    // propriétés côte à côte (`kind:` ... `provenance:`), motif qui ne survient
    // que dans la construction manuelle d'un Available.
    pattern: /\bkind:\s*''[\s\S]{0,90}?\bprovenance:\s*''|\bprovenance:\s*''[\s\S]{0,90}?\bkind:\s*''/g,
    message:
      'Objet Availability forcé à « available/manual » à la main — utiliser editorial() (jamais badgé Live) ou available() typé. Cf. VER-10.',
    // Les constructeurs canoniques (available/unavailable/editorial) vivent dans
    // model.ts : c'est le seul endroit où l'objet littéral est permis.
    exempt: (file) => /src[\\/]lib[\\/]vaults[\\/]model\.ts$/.test(file),
  },
  {
    id: 'COUNT_FROM_EMPTY_FALLBACK',
    // VER-01/02/03 : une longueur affichée dérivée d'un `?? []` replie l'absence
    // de la source sur « 0 mesuré ». Le compte doit propager l'Availability
    // (measuredCount / mapAvailability), pas repartir d'un tableau vide.
    pattern: /\?\?\s*\[\]\s*\)?\s*\.length\b|\(\s*\w+\s*\?\?\s*\[\]\s*\)\.length/g,
    message:
      'Compteur dérivé de `?? []` : une source absente devient « 0 » indistinguable d’un vrai zéro. Utiliser measuredCount() / propager l’Availability. Cf. VER-01/03.',
  },
]

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

/**
 * Retire commentaires et littéraux de chaîne avant analyse : une règle citée en
 * prose ou un libellé d'interface n'est pas du code qui fabrique de la donnée.
 */
function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

const files = SCAN.flatMap((dir) => walk(join(ROOT, dir)))
const runtimeFiles = files.filter((f) => !IS_TEST.test(f) && !IS_TEST_DIR.test(f))
const violations = []

for (const file of runtimeFiles) {
  const raw = readFileSync(file, 'utf8')
  const code = strip(raw)
  const relPath = relative(ROOT, file)
  for (const rule of RULES) {
    if (typeof rule.exempt === 'function' && rule.exempt(relPath)) continue
    rule.pattern.lastIndex = 0
    for (const match of code.matchAll(rule.pattern)) {
      const line = code.slice(0, match.index).split('\n').length
      violations.push({ file: relative(ROOT, file), line, rule, snippet: match[0].trim().slice(0, 70) })
    }
  }
}

console.log(`\n${B}check-no-mocks${X}  ${D}${runtimeFiles.length} fichiers runtime · ${RULES.length} règles${X}\n`)

if (violations.length === 0) {
  console.log(`${G}${B}✓ Aucune donnée simulée dans le runtime.${X}`)
  console.log(`${D}  Scanné : ${SCAN.join(', ')} — tests exclus.${X}\n`)
  process.exit(0)
}

for (const violation of violations) {
  console.log(`${R}✗ ${violation.rule.id}${X}  ${violation.file}:${violation.line}`)
  console.log(`  ${violation.rule.message}`)
  console.log(`  ${D}${violation.snippet}${X}\n`)
}
console.log(`${R}${B}✗ ${violations.length} violation(s).${X}\n`)
process.exit(1)
