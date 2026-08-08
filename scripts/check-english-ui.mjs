#!/usr/bin/env node
/**
 * Gate English-only UI — scans string literals and JSX text in runtime UI sources.
 * Case-insensitive: lowercase French copy must not escape.
 *
 * Usage: node scripts/check-english-ui.mjs [root]
 *        node scripts/check-english-ui.mjs --selftest
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const SELFTEST = process.argv.includes('--selftest')
const ROOT = resolve(
  process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) ?? process.cwd(),
)

const SCAN = ['src/app', 'src/components', 'src/features', 'src/lib', 'src/services']

const IS_TEST = /\.(test|spec)\.(ts|tsx)$/
const IS_TEST_DIR = /(^|\/)(__tests__|__mocks__|__fixtures__)(\/|$)/

/** Product French terms that must not appear in rendered UI string literals. */
const FORBIDDEN = [
  'Bonjour',
  'Encours',
  'Coffre',
  'Coffres',
  'Conformité',
  'Souscription',
  'Souscriptions',
  'Déploiement',
  'Disponible',
  'Indisponible',
  'Données indisponibles',
  'Activité récente',
  'Dernière',
  "Aujourd'hui",
  'Aujourd\u2019hui',
  'Hier',
  'À traiter',
  'État des sources',
  'Marché',
  'Produit',
  'Rééquilibrage',
  'Dérive',
  'Problème',
  'Hors ligne',
  'En direct',
  'Ouvrir',
  'Ajouter un client',
  'Clients récents',
  'Client récent',
  'Tableau de bord',
  'Se déconnecter',
  'Votre compte',
  'Capital déployé',
  'Exposition du portefeuille',
  'lang="fr"',
  'Joignable',
  'Chargement…',
  'Réessayer',
  'Demander un accès',
  'Se connecter',
  'Accéder à la console',
  'Un seul réseau',
  'Tous les espaces Hearst',
  'Chaque coffre',
  'Effleurez la grille',
  'Un accès unifié',
  'Page introuvable',
  'Registre',
  'Tableau',
  'Libellé',
  'Lecture',
  'Déployé',
  'Non renseigné',
  'Simulé',
  'Mouvements',
  'Identité',
  'Création',
  'Réponse',
  'Saisissez',
  'Envoyer',
  'Annuaire',
  'Détail',
  'Événement',
  'Paramètres',
  'Explorateur',
  'Concordance',
  'Écart signalé',
  'Servi',
  'Partiel',
  'Palier',
  'Surfaces',
  'Couverture',
  'Manquant',
  'Journal Série',
  'Indexé',
  'Déclenchement',
  'Exécuter',
  'Autorisation',
  'Métier',
  'Sondes',
  'Vivacité',
  'Prêt',
  'Matrice',
]

/** Backend reason keys in maps — identifiers, not UI copy. */
const REASON_KEY_LINE = /^\s*['"][a-z][a-z0-9_]*['"]\s*:/

/** Compiled matchers — accent terms case-insensitive; ASCII terms case-sensitive + lowercase UI. */
const FORBIDDEN_MATCHERS = FORBIDDEN.map((term) => {
  if (/^[A-Za-z]+$/.test(term)) {
    return {
      term,
      ascii: true,
      re: new RegExp(`(?:^|[^A-Za-z])${term}(?:[^A-Za-z]|$)`),
    }
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { term, ascii: false, re: new RegExp(escaped, 'iu') }
})

/** Import paths and route slugs — not rendered UI copy. */
function isPathOrIdentifierLiteral(text) {
  if (/^[@./]/.test(text)) return true
  if (text.includes('/') && !/\s/.test(text)) return true
  return false
}

function matchesForbidden(text, matcher) {
  if (isPathOrIdentifierLiteral(text)) return false
  return matcher.re.test(text)
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (IS_TEST_DIR.test(full)) continue
      walk(full, out)
    } else if (/\.(ts|tsx|jsx|js|mjs)$/.test(entry) && !IS_TEST.test(entry)) {
      out.push(full)
    }
  }
  return out
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

/** Extract quoted string literals from code (rough but sufficient for gate). */
function extractStringLiterals(code) {
  const literals = []
  const re = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
  let m
  while ((m = re.exec(code)) !== null) {
    literals.push({ text: m[2], index: m.index, kind: 'literal' })
  }
  return literals
}

/** Visible JSX text between tags — e.g. <button>Se déconnecter</button>. */
function extractJsxTextNodes(code) {
  const nodes = []
  const re = />([^<{][^<]*?)</g
  let m
  while ((m = re.exec(code)) !== null) {
    const text = m[1].trim()
    if (!text || text.includes('{')) continue
    nodes.push({ text, index: m.index + 1, kind: 'jsx' })
  }
  return nodes
}

function lineAt(code, index) {
  return code.slice(0, index).split('\n').length
}

function isReasonKeyLiteral(code, index) {
  const lineStart = code.lastIndexOf('\n', index) + 1
  const lineEnd = code.indexOf('\n', index)
  const line = code.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
  return REASON_KEY_LINE.test(line)
}

function shouldSkipFile(rel) {
  if (rel.endsWith('.bak')) return true
  if (/migrate-english/.test(rel)) return true
  return false
}

function shouldSkipTerm(term, rel) {
  if (term === 'Marché' && /market-panel|MarketSnapshot/i.test(rel)) return true
  if (term === 'Produit' && /product/i.test(rel) && !/produit/i.test(rel)) return true
  if (term === 'Rééquilibrage' && /rebalancing/i.test(rel)) return true
  return false
}

function scanRoot(root) {
  const files = SCAN.flatMap((d) => walk(join(root, d)))
  const hits = []

  for (const file of files) {
    const rel = relative(root, file)
    if (shouldSkipFile(rel)) continue
    const raw = readFileSync(file, 'utf8')
    const code = stripComments(raw)
    const fragments = [...extractStringLiterals(code), ...extractJsxTextNodes(code)]

    for (const { text, index, kind } of fragments) {
      if (kind === 'literal' && isReasonKeyLiteral(code, index)) continue
      for (const matcher of FORBIDDEN_MATCHERS) {
        if (!matchesForbidden(text, matcher)) continue
        if (shouldSkipTerm(matcher.term, rel)) continue
        hits.push({ file: rel, term: matcher.term, line: lineAt(code, index), kind })
      }
    }
  }

  return hits
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'english-ui-'))
  const src = join(dir, 'src/components')

  try {
    mkdirSync(src, { recursive: true })
    writeFileSync(
      join(src, 'bad.tsx'),
      `export function Bad() { return <button>se déconnecter</button> }\n`,
      'utf8',
    )
    writeFileSync(
      join(src, 'ok.tsx'),
      `export function Ok() { return <button>Sign out</button> }\n`,
      'utf8',
    )

    const hits = scanRoot(dir)
    if (!hits.some((h) => h.file.endsWith('bad.tsx') && h.term === 'Se déconnecter')) {
      console.error('selftest: lowercase French UI copy should be detected')
      process.exit(1)
    }
    if (hits.some((h) => h.file.endsWith('ok.tsx'))) {
      console.error('selftest: English fixture should pass')
      process.exit(1)
    }

    console.log('check-english-ui selftest OK')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (SELFTEST) {
  selftest()
  process.exit(0)
}

const hits = scanRoot(ROOT)

if (hits.length > 0) {
  console.error('\x1b[31mcheck-english-ui FAILED\x1b[0m')
  for (const h of hits.slice(0, 80)) {
    console.error(`  ${h.file}:${h.line} [${h.kind}]: "${h.term}"`)
  }
  if (hits.length > 80) console.error(`  … and ${hits.length - 80} more`)
  process.exit(1)
}

console.log('\x1b[32mcheck-english-ui OK\x1b[0m')
