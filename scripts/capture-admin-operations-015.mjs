/**
 * HC-ADMIN-OPERATIONS-CONTROL-015 — authenticated captures for /admin/operations.
 * Usage: E2E_PORT=4105 node scripts/capture-admin-operations-015.mjs
 * Mints a local admin session cookie — does not log secrets.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../.validation-015/after')
mkdirSync(OUT, { recursive: true })

const PORT = process.env.E2E_PORT ?? '4105'
const BASE = `http://localhost:${PORT}`
const BACKEND = (process.env.HEARST_API_URL ?? 'http://127.0.0.1:3900').replace(/:443$/, '')

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
const authSecret = env.AUTH_SECRET
if (!authSecret || authSecret.length < 32) {
  console.error('AUTH_SECRET missing or too short in .env.local')
  process.exit(1)
}

function mintLocalAdminToken() {
  const backendDir = resolve(__dirname, '../../../Dev/Hearst Corporation/hearst-connect-backend')
  const raw = execSync(
    'bash -lc "set -a && source .env && set +a && npx tsx scripts/mint-admin-token.ts"',
    { cwd: backendDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  )
  const lines = raw.trim().split('\n')
  return lines[lines.length - 1].trim()
}

function decodeTokenPayload(token) {
  const payloadB64 = token.split('.')[0]
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
}

function createSessionCookie(session) {
  const key = createHash('sha256').update(authSecret).digest()
  const payload = { ...session, exp: session.expiresAt }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

async function buildSession(backendToken) {
  const payload = decodeTokenPayload(backendToken)
  let email = 'admin@local'
  try {
    const profileRes = await fetch(`${BACKEND}/api/v1/profile`, {
      headers: { Authorization: `Bearer ${backendToken}`, Accept: 'application/json' },
    })
    if (profileRes.ok) {
      const profile = await profileRes.json()
      const identity = profile?.data?.identity?.value ?? profile?.data?.identity
      const fromIdentity = identity?.email
      if (typeof fromIdentity === 'string' && fromIdentity.includes('@')) email = fromIdentity.toLowerCase()
    }
  } catch {
    // identity-only profile may be PARTIAL for admin — session still valid with token
  }
  return {
    userId: payload.userId,
    email,
    name: email.split('@')[0] || 'admin',
    role: 'OWNER',
    backendToken,
    expiresAt: payload.exp,
  }
}

const backendToken = mintLocalAdminToken()
const session = await buildSession(backendToken)
const cookieValue = createSessionCookie(session)

const consoleErrors = []
let browser
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' })
} catch {
  browser = await chromium.launch({ headless: true })
}

async function shot(name, viewport, opts = {}) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: opts.zoom ?? 1,
  })
  await ctx.addCookies([
    {
      name: 'hearst_session',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const page = await ctx.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`${name}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`${name}: ${err.message}`))

  const res = await page.goto(`${BASE}/admin/operations`, { waitUntil: 'networkidle', timeout: 60_000 })
  const status = res?.status() ?? 0
  await page.waitForTimeout(800)

  const body = await page.locator('body').innerText()
  const checks = {
    status,
    hasOperations: /Operations/i.test(body),
    hasRebalancing: /Rebalancing/i.test(body),
    hasIndexer: /Run indexer/i.test(body),
    hasRecent: /Recent operations/i.test(body),
    noSourceActivity: !/Source activity/i.test(body),
    noDataContract: !/Data contract/i.test(body),
    noSignTx: !/Sign transaction/i.test(body),
    noExecuteOnChain: !/Execute on-chain/i.test(body),
    noOneClickRebalance: !/\bRebalance\b/.test(body) || /not exposed as a safe admin action/i.test(body),
  }
  console.log(JSON.stringify({ name, checks }, null, 2))

  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true })
  await ctx.close()
  return checks
}

const results = []
results.push(await shot('01-desktop-1440', { width: 1440, height: 900 }))
results.push(await shot('02-desktop-1280', { width: 1280, height: 800 }))
results.push(await shot('03-mobile-390', { width: 390, height: 844 }))
results.push(await shot('04-zoom-200', { width: 1440, height: 900 }, { zoom: 2 }))

await browser.close()

if (consoleErrors.length > 0) {
  console.error('Console errors:', consoleErrors)
  process.exit(1)
}

const failed = results.some(
  (r) =>
    r.status >= 400 ||
    !r.hasOperations ||
    !r.hasRebalancing ||
    !r.hasIndexer ||
    !r.noSourceActivity ||
    !r.noDataContract ||
    !r.noSignTx ||
    !r.noExecuteOnChain,
)
console.log(`Wrote captures to ${OUT}`)
process.exit(failed ? 1 : 0)
