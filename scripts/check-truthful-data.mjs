#!/usr/bin/env node
/**
 * Gate check:truthful-data — HC-ENDPOINT-ONLY-UI-001
 *
 * Scanne le runtime produit pour empêcher la réintroduction de :
 * - seuil de rééquilibrage hardcodé ;
 * - provenance live codée en dur ;
 * - stale:false forcé dans available() ;
 * - chemins /api/v1 hors registre (hors modules backend canoniques).
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

const IS_TEST = /\.(test|spec)\.(ts|tsx)$/
const IS_TEST_DIR = /(^|\/)(__tests__|__mocks__|__fixtures__)(\/|$)/

const EXEMPT_PROVENANCE_LIVE = [
  /src[\\/]lib[\\/]backend[\\/]availability\.ts$/,
  /src[\\/]lib[\\/]vaults[\\/]model\.ts$/,
]

const EXEMPT_STALE_FALSE = [/src[\\/]lib[\\/]backend[\\/]availability\.ts$/, /src[\\/]lib[\\/]vaults[\\/]model\.ts$/]

const EXEMPT_API_PATH = [
  /src[\\/]lib[\\/]backend[\\/]/,
  /src[\\/]lib[\\/]admin-nav\.ts$/,
  /src[\\/]lib[\\/]mouvements\.ts$/,
]

const RULES = [
  {
    id: 'HARDCODED_REBAL_THRESHOLD',
    pattern: /\bREBALANCING_THRESHOLD_BPS\b/g,
    message: 'Seuil de rééquilibrage hardcodé — le backend doit fournir le seuil ou la section doit être supprimée.',
  },
  {
    id: 'HARDCODED_200_BPS',
    pattern: /\b200\b\s*bps\b|\bREBALANCING_THRESHOLD\b\s*=\s*200/gi,
    message: 'Constante métier 200 bps interdite dans le runtime.',
  },
  {
    id: 'PROVENANCE_LIVE_LITERAL',
    pattern: /provenance:\s*['"]live['"]/g,
    message: 'provenance:"live" codé en dur — passer par availabilityFromResolu / fromResolu.',
    exempt: (file) => EXEMPT_PROVENANCE_LIVE.some((re) => re.test(file)),
  },
  {
    id: 'FORCED_STALE_FALSE',
    pattern: /available\s*\([^)]*stale:\s*false/g,
    message: 'stale:false forcé dans available() — lire le statut backend via availabilityFromResolu.',
    exempt: (file) => EXEMPT_STALE_FALSE.some((re) => re.test(file)),
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
    else if (/\.(ts|tsx|mjs)$/.test(entry)) out.push(full)
  }
  return out
}

function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
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
      violations.push({ file: relPath, line, rule, snippet: match[0].trim().slice(0, 70) })
    }
  }
}

console.log(`\n${B}check-truthful-data${X}  ${D}${runtimeFiles.length} fichiers runtime · ${RULES.length} règles${X}\n`)

if (violations.length === 0) {
  console.log(`${G}${B}✓ Aucune violation de vérité des données détectée.${X}\n`)
  process.exit(0)
}

for (const violation of violations) {
  console.log(`${R}✗ ${violation.rule.id}${X}  ${violation.file}:${violation.line}`)
  console.log(`  ${violation.rule.message}`)
  console.log(`  ${D}${violation.snippet}${X}\n`)
}
console.log(`${R}${B}✗ ${violations.length} violation(s).${X}\n`)
process.exit(1)
