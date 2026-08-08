/**
 * HC-BROWSER-PRODUCTION-PARITY-024 — read-only Vercel + Railway parity probe.
 * No deploy. Writes JSON to .validation-024/parity-report.json
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../.validation-024')
mkdirSync(OUT, { recursive: true })

const FRONT_GITHUB_MAIN = execSync('git rev-parse origin/main', {
  cwd: resolve(__dirname, '..'),
  encoding: 'utf8',
}).trim()

const FRONT_LOCAL = execSync('git rev-parse HEAD', {
  cwd: resolve(__dirname, '..'),
  encoding: 'utf8',
}).trim()

function parseEnv(path) {
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

const env = parseEnv(resolve(__dirname, '../.env.local'))
const API = (process.env.PROD_API_URL ?? env.HEARST_API_URL ?? 'https://hearst-connect-backend-production.up.railway.app').replace(
  /\/$/,
  '',
)
const FRONT_PROD = process.env.PROD_FRONT_URL ?? 'https://hearst-connect-v1.vercel.app'

let vercelDeploy = null
try {
  const raw = execSync('vercel ls 2>/dev/null | head -8', { encoding: 'utf8' })
  const line = raw.split('\n').find((l) => l.includes('● Ready') && l.includes('Production'))
  vercelDeploy = line?.trim() ?? null
} catch {
  vercelDeploy = 'vercel_cli_unavailable'
}

let backendOriginMain = null
try {
  backendOriginMain = execSync('git rev-parse origin/main', {
    cwd: resolve(__dirname, '../../../Dev/Hearst Corporation/hearst-connect-backend'),
    encoding: 'utf8',
  }).trim()
} catch {
  backendOriginMain = 'backend_repo_unavailable'
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, json }
}

const runtime = await fetchJson(`${API}/api/v1/runtime`)
const historyAnon = await fetchJson(`${API}/api/v1/rebalancing/history`)
const health = await fetchJson(`${API}/health`)

let historyAuthed = { status: null, json: null, skipped: true }
const email = env.DEV_QUICK_LOGIN_EMAIL
const password = env.DEV_QUICK_LOGIN_PASSWORD
if (email && password) {
  const loginRes = await fetchJson(`${API}/api/v1/auth/login`, {
    'content-type': 'application/json',
    accept: 'application/json',
  })
  // POST login
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  })
  const loginBody = await res.json().catch(() => ({}))
  const token = loginBody?.data?.token ?? loginBody?.token
  if (typeof token === 'string' && token.length > 0) {
    const hist = await fetchJson(`${API}/api/v1/rebalancing/history`, {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    })
    historyAuthed = { ...hist, skipped: false }
  } else {
    historyAuthed = { status: res.status, json: loginBody, skipped: false, loginFailed: true }
  }
}

const prodFrontRes = await fetch(FRONT_PROD, { signal: AbortSignal.timeout(15_000) })
const prodFrontStatus = prodFrontRes.status

const report = {
  mission: 'HC-BROWSER-PRODUCTION-PARITY-024',
  at: new Date().toISOString(),
  frontend: {
    githubMain: FRONT_GITHUB_MAIN,
    localHead: FRONT_LOCAL,
    prodUrl: FRONT_PROD,
    prodHttpStatus: prodFrontStatus,
    vercelLatestProductionLine: vercelDeploy,
    vercelMatchesGithubMain: vercelDeploy === null ? null : 'manual_inspect_required',
  },
  backend: {
    apiUrl: API,
    githubOriginMain: backendOriginMain,
    health,
    runtime,
    endpoints: {
      rebalancingHistoryAnon: historyAnon,
      rebalancingHistoryAuthed: historyAuthed,
    },
    productionCommitSha: runtime.json?.commitSha ?? null,
    rebalancingSnapshotScheduler: runtime.json?.rebalancingSnapshotScheduler ?? null,
  },
  driftHistoryWiring: {
    allowed: false,
    reason:
      historyAuthed.skipped === true
        ? 'auth_probe_skipped'
        : historyAuthed.status === 200 && historyAuthed.json?.data
          ? 'contract_ready_pending_orchestrator_decision'
          : `endpoint_not_validated_status_${historyAuthed.status}`,
  },
  deployPolicy: 'no_vercel_or_railway_deploy_in_this_pass',
}

writeFileSync(resolve(OUT, 'parity-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
