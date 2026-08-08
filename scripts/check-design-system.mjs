#!/usr/bin/env node
/**
 * Gate Design System — convergence des couleurs vers les tokens canoniques.
 *
 * Doctrine : l'accent, les surfaces et les états vivent dans UNE source de
 * tokens (`src/styles/tailwind.css`, `@theme`). Une route ou un module métier
 * ne doit pas poser une couleur littérale (hex brut). Les paliers Tailwind
 * structurels (slate|gray|neutral) sont INTERDITS — gate dédiée `check:no-zinc`
 * (`.cursor/rules/50-no-zinc.mdc`). Cette gate-ci ne traite que le hex brut
 * hors `var(--token, #fallback)`.
 *
 * Hors périmètre (volontairement) : `src/styles/**` (LA source de tokens),
 * les CSS modules `*.module.css` d'une composition (ils portent la matière,
 * sourcée des tokens), et les tests. Catalyst est inclus dans `check:no-zinc`.
 *
 * Usage : node scripts/check-design-system.mjs   (exit 1 si violation)
 * Preuve que la gate mord : node scripts/check-design-system.mjs --selftest
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd())
const SELFTEST = process.argv.includes('--selftest')

const R = '\x1b[31m'
const G = '\x1b[32m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

/** Fichiers de route et de module métier — là où une couleur doit être un token. */
const SCAN = [
  'src/app',
  'src/components/admin',
  'src/components/vaults',
  'src/components/marketing',
  // HC-AUDIT P2-20 : la référence (`src/features`) et la grammaire de carte
  // partagée (`src/components/compositions`) doivent aussi passer par des tokens.
  'src/features',
  'src/components/compositions',
]
const IS_TEST = /\.(test|spec)\.(ts|tsx)$/

/**
 * Un hex `#rrggbb` HORS d'un `var(--token, #fallback)`.
 *
 * On efface d'abord les commentaires et les occurrences `var(--…, #xxxxxx)`
 * (fallback légitime) ; ce qui reste et matche est un hex brut, la violation.
 */
const HEX = /#[0-9a-fA-F]{6}\b/g

function stripCommentsAndVarFallbacks(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
    // Efface les fallbacks de var() : var(--token, #abcdef) -> var(--token)
    .replace(/var\(\s*--[a-z0-9-]+\s*,\s*#[0-9a-fA-F]{6}\s*\)/gi, 'var(--token)')
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

function scanText(relPath, source) {
  const found = []
  const code = stripCommentsAndVarFallbacks(source)
  for (const m of code.matchAll(HEX)) {
    const line = code.slice(0, m.index).split('\n').length
    found.push({ file: relPath, line, rule: 'HEX_LITERAL', snippet: m[0] })
  }
  return found
}

if (SELFTEST) {
  // Fixtures négative (doit passer) et positive (doit mordre).
  const clean = `const s = { color: 'var(--color-accent-300, #a7fb90)' }; <div className="text-accent-400" />`
  const dirtyHex = `const s = { color: '#4bbf9f' }`
  const okClean = scanText('fixture-clean.tsx', clean).length === 0
  const okHex = scanText('fixture-hex.tsx', dirtyHex).some((v) => v.rule === 'HEX_LITERAL')
  const pass = okClean && okHex
  console.log(`\n${B}check-design-system --selftest${X}`)
  console.log(`  fixture propre (var+token, classe accent) ne mord pas : ${okClean ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  console.log(`  fixture hex brut mord (HEX_LITERAL)               : ${okHex ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  process.exit(pass ? 0 : 1)
}

const files = SCAN.flatMap((dir) => walk(join(ROOT, dir))).filter((f) => !IS_TEST.test(f))
const violations = []
for (const file of files) {
  const rel = relative(ROOT, file)
  violations.push(...scanText(rel, readFileSync(file, 'utf8')))
}

console.log(`\n${B}check-design-system${X}  ${D}${files.length} fichiers de route/module · 1 règle${X}\n`)

if (violations.length === 0) {
  console.log(`${G}${B}✓ Couleurs convergées : aucun hex brut hors tokens.${X}`)
  console.log(`${D}  Scanné : ${SCAN.join(', ')} — src/styles (tokens), catalyst (vendoré), *.module.css exclus.${X}\n`)
  process.exit(0)
}

for (const v of violations) {
  console.log(`${R}✗ ${v.rule}${X}  ${v.file}:${v.line}  ${D}${v.snippet}${X}`)
}
console.log(`\n${R}${B}✗ ${violations.length} couleur(s) hors tokens.${X}`)
console.log(`${D}  Passer par un token (\`var(--color-…)\` / classe \`accent-*\`) ou un fallback \`var(--token, #hex)\`.${X}\n`)
process.exit(1)
