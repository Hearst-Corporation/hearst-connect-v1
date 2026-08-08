#!/usr/bin/env node
/**
 * Gate — Admin DS contract (HC-ADMIN-DESIGN-SYSTEM-FORENSIC-033).
 *
 * Why check:ds / check:no-zinc were green while the DOM showed blue focus + lime:
 * - check:ds only bans raw hex literals — not Tailwind structural color utilities
 *   (lime-/blue-/…) nor Catalyst `color="lime"` props.
 * - The structural-neutral gate only bans the forbidden neutral ramp family — not
 *   status palettes (lime, amber, red, rose, green, blue…).
 * - Catalyst vendor is out of scope for product fixes, but product *wrappers*
 *   that *select* vendor raw variants (`color="lime"`) were never gated.
 *
 * This gate closes that hole for product runtime (not Catalyst vendor):
 * 1. No Catalyst color prop selecting a raw palette (lime|green|amber|red|rose|…).
 * 2. No raw status utility classes (bg-lime-*, text-amber-*, outline-blue-*, …).
 * 3. Hearst actions must not map tones to Catalyst raw color names.
 *
 * Usage: node scripts/check-admin-ds-contract.mjs
 * Self-test: node scripts/check-admin-ds-contract.mjs --selftest
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

const SCAN = [
  'src/app/admin',
  'src/components/admin',
  'src/components/actions',
  'src/components/charts',
  'src/components/compositions',
  'src/components/layout',
  'src/components/vaults',
  'src/features',
]

const IS_TEST = /\.(test|spec)\.(ts|tsx)$/
const RAW_COLORS = 'lime|green|emerald|amber|yellow|red|rose|orange|blue|indigo|sky|cyan|violet|purple|fuchsia|pink|teal'

/** Catalyst color= selecting a raw palette (not neutral/white/dark*). */
const COLOR_PROP = new RegExp(
  String.raw`(?:color\s*=\s*\{?\s*["'\`](?:${RAW_COLORS})["'\`]|color\s*=\s*\{["'\`](?:${RAW_COLORS})["'\`]\})`,
  'g',
)

/** Tailwind utility using a raw status/structural color ramp. */
const RAW_UTILITY = new RegExp(
  `(?:^|[\\s"'\`])(?:bg|text|border|ring|outline|from|to|via|fill|stroke)-(?:${RAW_COLORS})(?:-\\d{2,3}|/)`,
  'g',
)

/** Hearst tone map still pointing at Catalyst raw color keys. */
const TONE_COLOR_RAW = /(?:TONE_COLOR|STATUS_COLOR)\s*[:=][\s\S]{0,400}?(?:lime|amber|['"]red['"])/g

function stripComments(source) {
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

function scanText(relPath, source) {
  const found = []
  const code = stripComments(source)
  for (const m of code.matchAll(COLOR_PROP)) {
    found.push({ file: relPath, line: code.slice(0, m.index).split('\n').length, rule: 'RAW_COLOR_PROP', snippet: m[0].trim() })
  }
  for (const m of code.matchAll(RAW_UTILITY)) {
    found.push({ file: relPath, line: code.slice(0, m.index).split('\n').length, rule: 'RAW_COLOR_UTILITY', snippet: m[0].trim() })
  }
  for (const m of code.matchAll(TONE_COLOR_RAW)) {
    found.push({ file: relPath, line: code.slice(0, m.index).split('\n').length, rule: 'RAW_TONE_MAP', snippet: m[0].slice(0, 80).replace(/\s+/g, ' ') })
  }
  return found
}

if (SELFTEST) {
  const clean = `import { AdminToneBadge } from './status-tone'\n<AdminToneBadge tone="accent">indexed</AdminToneBadge>\nconst s = { '--btn-bg': 'var(--color-accent-400)' }`
  const dirtyProp = `<Badge color="lime">ok</Badge>`
  const dirtyUtil = `className="bg-lime-400/20 text-lime-700"`
  const dirtyMap = `const STATUS_COLOR = { indexed: 'lime' }`
  const okClean = scanText('clean.tsx', clean).length === 0
  const okProp = scanText('prop.tsx', dirtyProp).some((v) => v.rule === 'RAW_COLOR_PROP')
  const okUtil = scanText('util.tsx', dirtyUtil).some((v) => v.rule === 'RAW_COLOR_UTILITY')
  const okMap = scanText('map.tsx', dirtyMap).some((v) => v.rule === 'RAW_TONE_MAP')
  const pass = okClean && okProp && okUtil && okMap
  console.log(`\n${B}check-admin-ds-contract --selftest${X}`)
  console.log(`  clean semantic tone                 : ${okClean ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  console.log(`  color="lime" mord (RAW_COLOR_PROP)  : ${okProp ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  console.log(`  bg-lime-* mord (RAW_COLOR_UTILITY)  : ${okUtil ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  console.log(`  STATUS_COLOR lime mord (RAW_TONE)   : ${okMap ? G + 'OK' : R + 'ÉCHEC'}${X}`)
  process.exit(pass ? 0 : 1)
}

const files = SCAN.flatMap((dir) => walk(join(ROOT, dir))).filter((f) => !IS_TEST.test(f))
const violations = []
for (const file of files) {
  const rel = relative(ROOT, file)
  violations.push(...scanText(rel, readFileSync(file, 'utf8')))
}

console.log(`\n${B}check-admin-ds-contract${X}  ${D}${files.length} fichiers produit · 3 règles${X}\n`)

if (violations.length === 0) {
  console.log(`${G}${B}✓ Contrat DS admin : pas de palette raw produit (focus/color/status).${X}`)
  console.log(`${D}  Scanné : ${SCAN.join(', ')} — catalyst vendor exclu.${X}\n`)
  process.exit(0)
}

for (const v of violations) {
  console.log(`${R}✗${X} ${v.rule.padEnd(18)} ${D}${v.file}:${v.line}${X}`)
  console.log(`  ${v.snippet}`)
}
console.log(`\n${R}${B}${violations.length} violation(s)${X} — utiliser tokens sémantiques / AdminToneBadge / Hearst style vars.\n`)
process.exit(1)
