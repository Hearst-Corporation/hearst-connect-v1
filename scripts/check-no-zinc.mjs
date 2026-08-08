#!/usr/bin/env node
/**
 * Gate NO-ZINC — Hearst Connect must never use Tailwind's Zinc palette.
 *
 * Forbidden: zinc utilities, --color-zinc-*, color="zinc", dark/zinc, identifiers
 * containing zinc in frontend-owned sources.
 *
 * Narrow allowlist (enforcement only — must keep the forbidden word to detect it):
 *   - this file
 *   - .cursor/rules/50-no-zinc.mdc
 *
 * Other files may name the gate (`check:no-zinc`, rule filename) — those phrases
 * are scrubbed before the scan so documentation can point at enforcement.
 *
 * Usage : node scripts/check-no-zinc.mjs
 *         node scripts/check-no-zinc.mjs --selftest
 */

import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, mkdtempSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()

const ALLOWLIST = new Set([
  'scripts/check-no-zinc.mjs',
  '.cursor/rules/50-no-zinc.mdc',
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
])

const SCAN_ROOTS = ['src', 'tests', 'scripts', 'README.md', 'AGENTS.md', 'CLAUDE.md', '.cursor', 'package.json']

const FORBIDDEN = /zinc/i

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

function collectFiles() {
  const files = []
  for (const entry of SCAN_ROOTS) {
    const path = join(ROOT, entry)
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

function scan() {
  const violations = []
  for (const file of collectFiles()) {
    const rel = relative(ROOT, file)
    if (ALLOWLIST.has(rel)) continue
    const text = scrubEnforcementMentions(readFileSync(file, 'utf8'))
    if (!FORBIDDEN.test(text)) continue
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (FORBIDDEN.test(lines[i])) {
        violations.push({ file: rel, line: i + 1, excerpt: lines[i].trim().slice(0, 120) })
      }
    }
  }
  return violations
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'no-zinc-'))
  const bad = join(dir, 'bad.tsx')
  writeFileSync(bad, 'export const x = "text-zinc-500"\n')
  if (!FORBIDDEN.test(scrubEnforcementMentions(readFileSync(bad, 'utf8')))) {
    console.error('selftest: failed to detect zinc in fixture')
    process.exit(1)
  }
  const doc = 'See pnpm run check:no-zinc and .cursor/rules/50-no-zinc.mdc\n'
  if (FORBIDDEN.test(scrubEnforcementMentions(doc))) {
    console.error('selftest: enforcement mentions should be scrubbed')
    process.exit(1)
  }
  unlinkSync(bad)
  console.log('check-no-zinc selftest OK')
}

if (process.argv.includes('--selftest')) {
  selftest()
  process.exit(0)
}

const violations = scan()
if (violations.length > 0) {
  console.error('\n✗ check-no-zinc : Zinc is forbidden in Hearst Connect frontend\n')
  for (const v of violations.slice(0, 80)) {
    console.error(`  ${v.file}:${v.line}  ${v.excerpt}`)
  }
  if (violations.length > 80) {
    console.error(`  … and ${violations.length - 80} more`)
  }
  console.error('\nUse Hearst semantic tokens (fg / ink / console-*). See .cursor/rules/50-no-zinc.mdc\n')
  process.exit(1)
}

console.log('check-no-zinc OK')
