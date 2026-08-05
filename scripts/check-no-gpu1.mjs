#!/usr/bin/env node
/**
 * Gate anti-GPU1 — interdit les références à l'hôte GPU1 / connect-api comme
 * cible backend de Hearst Connect dans les fichiers opérationnels du dépôt.
 *
 * Le backend canonique est Railway (HEARST_API_URL). GPU1 n'est pas notre runtime.
 *
 * Usage : node scripts/check-no-gpu1.mjs
 *         node scripts/check-no-gpu1.mjs --selftest
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

/** Motifs interdits partout (y compris docs opérationnelles). */
const FORBIDDEN_ANYWHERE = [
  { pattern: /deploy-gpu1\.sh/i, label: 'deploy-gpu1.sh' },
  { pattern: /\bgpu1-connect-backend\b/i, label: 'gpu1-connect-backend' },
  { pattern: /ssh\s+gpu1\b/i, label: 'ssh gpu1' },
  { pattern: /100\.88\.191\.49/i, label: 'IP Tailscale GPU1 (100.88.191.49)' },
]

/** Motifs interdits dans le code et la config (pas les mentions « interdit » en doc). */
const FORBIDDEN_RUNTIME = [
  { pattern: /HEARST_API_URL\s*=\s*[^\n#]*connect-api/i, label: 'HEARST_API_URL pointant vers connect-api (GPU1)' },
  { pattern: /['"`]https:\/\/connect-api\.hearst\.app/i, label: 'URL connect-api.hearst.app en dur' },
]

const RUNTIME_SCAN_ROOTS = ['.env.example', 'src', 'scripts']

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', 'test-results', 'playwright-report'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const rel = relative(ROOT, path)
    if (SKIP_DIRS.has(name)) continue
    const st = statSync(path)
    if (st.isDirectory()) {
      walk(path, out)
      continue
    }
    if (/\.(ts|tsx|mjs|js|md|mdc|example|json|properties)$/.test(name)) {
      out.push(path)
    }
  }
  return out
}

function collectFiles(roots) {
  const files = []
  for (const entry of roots) {
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

function matchFile(file, patterns) {
  const rel = relative(ROOT, file)
  if (rel === 'scripts/check-no-gpu1.mjs') return []
  const text = readFileSync(file, 'utf8')
  const hits = []
  for (const { pattern, label } of patterns) {
    if (pattern.test(text)) hits.push({ file: rel, label })
  }
  return hits
}

function scan() {
  const violations = []
  for (const file of collectFiles(RUNTIME_SCAN_ROOTS)) {
    violations.push(...matchFile(file, [...FORBIDDEN_ANYWHERE, ...FORBIDDEN_RUNTIME]))
  }
  return violations
}

function selftest() {
  const bad = scan()
  const expectClean = ['README.md', 'CLAUDE.md', '.env.example']
  for (const f of expectClean) {
    if (bad.some((v) => v.file === f)) {
      console.error(`selftest: ${f} should be clean but matched GPU1 patterns`)
      process.exit(1)
    }
  }
  console.log('check-no-gpu1 selftest OK')
}

if (process.argv.includes('--selftest')) {
  selftest()
  process.exit(0)
}

const violations = scan()
if (violations.length > 0) {
  console.error('\n✗ check-no-gpu1 : références GPU1 interdites détectées :\n')
  for (const v of violations) {
    console.error(`  ${v.file} → ${v.label}`)
  }
  console.error('\nBackend canonique : Railway (HEARST_API_URL). Voir .cursor/rules/30-no-gpu1.mdc\n')
  process.exit(1)
}

console.log('check-no-gpu1 OK')
