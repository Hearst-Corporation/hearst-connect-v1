#!/usr/bin/env node
/**
 * Gate NO-ZINC — Hearst Connect must never use Tailwind's Zinc palette.
 *
 * Forbidden:
 *   - zinc utilities (text-zinc-*, bg-zinc-*, ring-zinc-*, dark/zinc, …)
 *   - CSS vars --color-zinc-*
 *   - color="zinc" / color='zinc' / variant zinc in Catalyst
 *   - frontend-owned identifiers containing zinc
 *   - structural neutral ramps (slate|gray|neutral)-NN as Tailwind replacement
 *
 * Narrow allowlist (enforcement only — must keep the forbidden word to detect it):
 *   - this file
 *   - .cursor/rules/50-no-zinc.mdc
 *
 * Other files may name the gate (`check:no-zinc`, rule filename) — those phrases
 * are scrubbed before the scan so documentation can point at enforcement.
 *
 * Usage : node scripts/check-no-zinc.mjs [root]
 *         node scripts/check-no-zinc.mjs --selftest
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const SELFTEST = process.argv.includes('--selftest')
const ROOT = resolve(
  process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) ?? process.cwd(),
)

const ALLOWLIST = new Set([
  'scripts/check-no-zinc.mjs',
  '.cursor/rules/50-no-zinc.mdc',
  'tests/check-no-zinc-gate.test.ts',
  'tests/check-english-ui-gate.test.ts',
  'tests/marketing-no-zinc.test.ts',
])

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
  '.git',
  '.validation-007',
  '.validation-008',
  '.validation-010',
  '.validation-013',
  '.validation-014',
  '.validation-015',
])

const SCAN_ROOTS = ['src', 'tests', 'scripts', 'README.md', 'AGENTS.md', 'CLAUDE.md', '.cursor', 'package.json']

/** Zinc palette — utilities, props, CSS vars, identifiers. */
const ZINC = /\bzinc\b/i

/** Tailwind structural neutrals used as zinc replacement — forbidden. */
const STRUCTURAL_NEUTRAL = /\b(?:slate|gray|neutral)-\d{2,3}\b/

const RULES = [
  { id: 'ZINC', re: ZINC },
  { id: 'STRUCTURAL_NEUTRAL', re: STRUCTURAL_NEUTRAL },
]

/** Phrases that document/enforce the ban — not usage. */
function scrubEnforcementMentions(text) {
  return text
    .replace(/check:no-zinc/gi, '')
    .replace(/check-no-zinc\.mjs/gi, '')
    .replace(/check-no-zinc/gi, '')
    .replace(/50-no-zinc\.mdc/gi, '')
    .replace(/50-no-zinc/gi, '')
    .replace(/HC-FRONTEND-NO-ZINC-013/gi, '')
    .replace(/NO-ZINC/gi, '')
    .replace(/marketing-no-zinc\.test\.ts/gi, '')
    .replace(/marketing-no-zinc/gi, '')
    .replace(/check-no-zinc-gate\.test\.ts/gi, '')
    .replace(/neutral\|slate\|gray-\*\\d\{2,3\}/g, '')
    .replace(/\(slate\|gray\|neutral\)-\\d\{2,3\}/g, '')
    .replace(/slate\|gray\|neutral/gi, '')
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const path = join(dir, name)
    const st = statSync(path)
    if (st.isDirectory()) {
      walk(path, out)
      continue
    }
    if (/\.(ts|tsx|mjs|js|cjs|css|md|mdc|json|example|html)$/i.test(name)) {
      out.push(path)
    }
  }
  return out
}

function collectFiles(root) {
  const files = []
  for (const entry of SCAN_ROOTS) {
    const path = join(root, entry)
    try {
      const st = statSync(path)
      if (st.isDirectory()) walk(path, files)
      else files.push(path)
    } catch {
      /* absent */
    }
  }
  return [...new Set(files)]
}

function scan(root) {
  const violations = []
  for (const file of collectFiles(root)) {
    const rel = relative(root, file)
    if (ALLOWLIST.has(rel)) continue
    const text = scrubEnforcementMentions(readFileSync(file, 'utf8'))
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const rule of RULES) {
        if (!rule.re.test(line)) continue
        violations.push({
          file: rel,
          line: i + 1,
          rule: rule.id,
          excerpt: line.trim().slice(0, 120),
        })
      }
    }
  }
  return violations
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'no-zinc-'))
  const src = join(dir, 'src/components')

  try {
    const fixtures = [
      ['zinc-util.tsx', 'export const x = "text-zinc-500 dark:bg-zinc-800"'],
      ['zinc-prop.tsx', '<Badge color="zinc" />'],
      ['zinc-var.css', ':root { --color-zinc-500: #000; }'],
      ['structural.tsx', 'className="bg-slate-900 text-gray-400 border-neutral-200"'],
      ['clean.tsx', 'className="bg-console-surface text-fg-secondary"'],
    ]

    mkdirSync(src, { recursive: true })
    for (const [name, body] of fixtures) {
      writeFileSync(join(src, name), `${body}\n`)
    }

    const violations = scan(dir)
    const rules = (suffix) => violations.filter((v) => v.file.endsWith(suffix)).map((v) => v.rule)

    if (!rules('zinc-util.tsx').includes('ZINC')) {
      console.error('selftest: zinc utility fixture should fail')
      process.exit(1)
    }
    if (!rules('zinc-prop.tsx').includes('ZINC')) {
      console.error('selftest: color="zinc" fixture should fail')
      process.exit(1)
    }
    if (!rules('zinc-var.css').includes('ZINC')) {
      console.error('selftest: --color-zinc-* fixture should fail')
      process.exit(1)
    }
    if (!rules('structural.tsx').includes('STRUCTURAL_NEUTRAL')) {
      console.error('selftest: slate|gray|neutral ramp fixture should fail')
      process.exit(1)
    }
    if (rules('clean.tsx').length > 0) {
      console.error('selftest: semantic token fixture should pass')
      process.exit(1)
    }

    const doc = 'See pnpm run check:no-zinc and .cursor/rules/50-no-zinc.mdc\n'
    if (ZINC.test(scrubEnforcementMentions(doc))) {
      console.error('selftest: enforcement mentions should be scrubbed')
      process.exit(1)
    }

    console.log('check-no-zinc selftest OK')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (SELFTEST) {
  selftest()
  process.exit(0)
}

const violations = scan(ROOT)
if (violations.length > 0) {
  console.error('\n✗ check-no-zinc : Zinc and structural neutrals are forbidden\n')
  for (const v of violations.slice(0, 80)) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.excerpt}`)
  }
  if (violations.length > 80) {
    console.error(`  … and ${violations.length - 80} more`)
  }
  console.error('\nUse Hearst semantic tokens (fg / ink / console-*). See .cursor/rules/50-no-zinc.mdc\n')
  process.exit(1)
}

console.log('check-no-zinc OK')
