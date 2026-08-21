#!/usr/bin/env node
/**
 * Probe admin surfaces — vérifie que chaque endpoint clé répond et retourne des données.
 * Usage: node scripts/probe-admin-plug.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.argv[1], '../..')

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8')
    const out = {}
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq <= 0) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      out[key] = val
    }
    return out
  } catch {
    return {}
  }
}

const env = { ...loadEnvFile(resolve(ROOT, '.env')), ...loadEnvFile(resolve(ROOT, '.env.local')) }
const base = (env.HEARST_API_URL ?? '').replace(/\/$/, '')
const email = env.DEV_QUICK_LOGIN_EMAIL || env.ADRIEN_OWNER_EMAIL
const password = env.DEV_QUICK_LOGIN_PASSWORD || env.ADRIEN_OWNER_PASSWORD

const PROBES = [
  { surface: 'Dashboard', path: '/api/v1/dashboard', pick: (d) => d?.overview?.value ? 'overview OK' : d?.overview?.status ?? 'empty' },
  { surface: 'Clients recent', path: '/api/v1/admin/clients/recent', pick: (d) => `${d?.clients?.value?.length ?? 0} clients` },
  { surface: 'Clients registry', path: '/api/v1/clients', pick: (d) => `${Array.isArray(d) ? d.length : d?.clients?.value?.length ?? '?'} clients` },
  { surface: 'Vault', path: '/api/v1/vault', pick: (d) => d?.vault?.value?.id ?? d?.vault?.status ?? '—' },
  { surface: 'Rebalancing status', path: '/api/v1/rebalancing/status', pick: (d) => d?.status?.value?.indexerStatus ?? d?.status?.status ?? '—' },
  { surface: 'Rebalancing history', path: '/api/v1/rebalancing/history?limit=90', pick: (d) => `${d?.history?.value?.length ?? 0} points (${d?.history?.status ?? '?'})` },
  { surface: 'Rebalancing events', path: '/api/v1/events/rebalancing?limit=20', pick: (d) => `${d?.events?.value?.length ?? 0} events` },
  { surface: 'Mining', path: '/api/v1/mining', pick: (d) => d?.aggregate?.status ?? '—' },
  { surface: 'Compliance', path: '/api/v1/compliance', pick: (d) => `${d?.reviews?.value?.length ?? 0} reviews` },
  { surface: 'Series 1 events', path: '/api/v1/series1/events?limit=10', pick: (d) => `${d?.events?.value?.length ?? 0} events` },
  { surface: 'Product factsheet', path: '/api/v1/product/factsheet', pick: (d) => d?.factsheet?.status ?? '—' },
  { surface: 'Profile', path: '/api/v1/profile', pick: (d) => d?.profile?.value?.email ?? d?.profile?.status ?? '—' },
  { surface: 'Runtime', path: '/api/v1/runtime', pick: (d) => d?.runtime?.value?.service ?? d?.runtime?.status ?? '—' },
]

function unwrap(body) {
  if (body && typeof body === 'object' && 'data' in body && 'meta' in body) return body.data
  return body
}

async function login() {
  if (!base) throw new Error('HEARST_API_URL manquant')
  if (!email || !password) throw new Error('DEV_QUICK_LOGIN_* ou ADRIEN_OWNER_* manquant dans .env.local')

  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login ${res.status}`)
  const body = await res.json()
  const token = body.access_token ?? body.token
  if (!token) throw new Error('login OK but no token')
  return token
}

async function probe(token, { surface, path, pick }) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 80)
  }
  const data = unwrap(body)
  let detail = '—'
  try {
    detail = pick(data)
  } catch {
    detail = res.ok ? 'parse err' : String(body?.detail ?? body?.title ?? res.status)
  }
  return { surface, path, http: res.status, detail, plugged: res.ok }
}

console.log(`\nProbe admin plug → ${base}\n`)
console.log('Surface'.padEnd(22), 'HTTP', 'Data')
console.log('—'.repeat(60))

try {
  const token = await login()
  const rows = []
  for (const p of PROBES) {
    const row = await probe(token, p)
    rows.push(row)
    const mark = row.plugged ? '✓' : '✗'
    console.log(`${mark} ${row.surface.padEnd(20)} ${String(row.http).padEnd(4)} ${row.detail}`)
  }
  const ok = rows.filter((r) => r.plugged).length
  console.log(`\n${ok}/${rows.length} endpoints OK`)
  process.exit(ok === rows.length ? 0 : 1)
} catch (err) {
  console.error('Probe failed:', err.message)
  process.exit(1)
}
