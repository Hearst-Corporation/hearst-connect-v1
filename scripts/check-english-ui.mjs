#!/usr/bin/env node
/**
 * Gate English-only UI — scans string literals in runtime UI sources.
 * Usage: node scripts/check-english-ui.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(process.argv[2] ?? process.cwd())
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
  'Aujourd’hui',
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
  'Page introuvable',
  'Registre',
  'Coffre',
  'Coffres',
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
    literals.push({ text: m[2], index: m.index })
  }
  return literals
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

function textIncludesForbidden(text, term) {
  if (/^[A-Za-z]+$/.test(term)) {
    return new RegExp(`(?:^|[^A-Za-z])${term}(?:[^A-Za-z]|$)`).test(text)
  }
  return text.includes(term)
}

function shouldSkipTerm(term, rel) {
  if (term === 'Marché' && /market-panel|MarketSnapshot/i.test(rel)) return true
  if (term === 'Produit' && /product/i.test(rel) && !/produit/.test(rel)) return true
  if (term === 'Rééquilibrage' && /rebalancing/i.test(rel)) return true
  return false
}

const files = SCAN.flatMap((d) => walk(join(ROOT, d)))
const hits = []

for (const file of files) {
  const rel = relative(ROOT, file)
  if (shouldSkipFile(rel)) continue
  const raw = readFileSync(file, 'utf8')
  const code = stripComments(raw)
  for (const { text, index } of extractStringLiterals(code)) {
    if (isReasonKeyLiteral(code, index)) continue
    for (const term of FORBIDDEN) {
      if (!textIncludesForbidden(text, term)) continue
      if (shouldSkipTerm(term, rel)) continue
      hits.push({ file: rel, term, line: lineAt(code, index) })
    }
  }
}

if (hits.length > 0) {
  console.error('\x1b[31mcheck-english-ui FAILED\x1b[0m')
  for (const h of hits.slice(0, 80)) {
    console.error(`  ${h.file}:${h.line}: "${h.term}"`)
  }
  if (hits.length > 80) console.error(`  … and ${hits.length - 80} more`)
  process.exit(1)
}

console.log('\x1b[32mcheck-english-ui OK\x1b[0m')
