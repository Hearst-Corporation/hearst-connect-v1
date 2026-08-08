/**
 * HC-ADMIN-DASHBOARD-LIVE-VALIDATION-007 — smoke des 9 read models admin.
 * Usage: node scripts/validate-admin-live.mjs [baseUrl]
 * Ne logue jamais email/mot de passe/token.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.argv[2] ?? 'http://127.0.0.1:3900'

function parseEnvFile(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    out[t.slice(0, i)] = t.slice(i + 1).trim()
  }
  return out
}

const env = parseEnvFile(resolve(__dirname, '../.env.local'))
const email = env.DEV_QUICK_LOGIN_EMAIL
const password = env.DEV_QUICK_LOGIN_PASSWORD

if (!email || !password) {
  console.error('DEV_QUICK_LOGIN_* absent de .env.local')
  process.exit(1)
}

async function login() {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('LOGIN_FAIL', res.status, body?.code ?? body?.title ?? 'unknown')
    process.exit(1)
  }
  const token = body?.token
  if (typeof token !== 'string') {
    console.error('LOGIN_FAIL no token in body')
    process.exit(1)
  }
  return token
}

const ENDPOINTS = [
  { id: 'overview', path: '/api/v1/admin/portfolio/overview', key: 'overview' },
  { id: 'exposure', path: '/api/v1/admin/portfolio/exposure', key: 'exposure' },
  { id: 'rebalancing', path: '/api/v1/admin/rebalancing/summary', key: 'summary' },
  { id: 'timeseries', path: '/api/v1/admin/activity/timeseries?range=28d', key: 'timeseries' },
  { id: 'market', path: '/api/v1/admin/market/snapshot', key: 'snapshot' },
  { id: 'vaults', path: '/api/v1/admin/vaults/summary', key: 'vaultsSummary' },
  { id: 'clients', path: '/api/v1/admin/clients/recent?limit=5', key: 'clients' },
  { id: 'activity', path: '/api/v1/admin/activity/recent?limit=10', key: 'events' },
  { id: 'health', path: '/api/v1/admin/data-health', key: 'sources' },
]

function summarizeBlock(block) {
  if (!block || typeof block !== 'object') return { status: 'MISSING' }
  return {
    status: block.status ?? null,
    reason: block.reason ?? null,
    provenance: block.provenance ?? null,
    asOf: block.freshness?.asOf ?? null,
    valueType: block.value === null ? 'null' : Array.isArray(block.value) ? `array(${block.value.length})` : typeof block.value,
    valuePreview:
      block.value && typeof block.value === 'object' && !Array.isArray(block.value)
        ? Object.fromEntries(Object.entries(block.value).slice(0, 12).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length})` : v]))
        : block.value,
  }
}

const token = await login()
console.log(JSON.stringify({ base: BASE, login: 'ok', role: 'token_received' }, null, 2))

for (const ep of ENDPOINTS) {
  const res = await fetch(`${BASE}${ep.path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const body = await res.json().catch(() => null)
  const block = body?.data?.[ep.key]
  console.log(
    JSON.stringify(
      {
        endpoint: ep.id,
        http: res.status,
        meta: body?.meta ?? null,
        block: summarizeBlock(block),
      },
      null,
      2,
    ),
  )
}
