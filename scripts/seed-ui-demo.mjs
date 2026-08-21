#!/usr/bin/env node
/**
 * Lance seed-demo sur le backend Hearst Connect (Postgres requis).
 *
 * Usage:
 *   HEARST_BACKEND_DIR=../hearst-connect-backend node scripts/seed-ui-demo.mjs [days] [--dry-run]
 *
 * Prérequis backend: .env avec DATABASE_URL (+ DIRECT_DATABASE_URL)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.argv[1], '../..')
const backendDir = process.env.HEARST_BACKEND_DIR ?? resolve(ROOT, '../hearst-connect-backend')
const seedScript = resolve(backendDir, 'scripts/seed-demo.ts')
const extraArgs = process.argv.slice(2)

if (!existsSync(seedScript)) {
  console.error(`Backend seed introuvable: ${seedScript}`)
  console.error('Définir HEARST_BACKEND_DIR ou cloner hearst-connect-backend à côté du front.')
  process.exit(1)
}

function loadEnv(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

const backendEnv = loadEnv(resolve(backendDir, '.env'))
if (!backendEnv?.includes('DATABASE_URL=')) {
  console.error(`Pas de DATABASE_URL dans ${backendDir}/.env`)
  console.error('Copier .env.example → .env dans hearst-connect-backend et remplir la DB Railway/Supabase.')
  process.exit(1)
}

const tsx = resolve(backendDir, 'node_modules/.bin/tsx')
const runner = existsSync(tsx) ? tsx : 'tsx'

console.log(`→ pnpm/tsx seed-demo in ${backendDir}`)

const result = spawnSync(runner, [seedScript, ...extraArgs], {
  cwd: backendDir,
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
