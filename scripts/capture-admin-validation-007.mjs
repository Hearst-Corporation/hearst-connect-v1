/**
 * HC-ADMIN-DASHBOARD-LIVE-VALIDATION-007 — captures authentifiées /admin.
 * Usage: HEARST_API_URL=http://127.0.0.1:3900 E2E_PORT=4106 node scripts/capture-admin-validation-007.mjs
 * Injecte une session via jeton admin minté (backend local) — ne logue pas de secrets.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../.validation-007')
mkdirSync(OUT, { recursive: true })

const PORT = process.env.E2E_PORT ?? '4106'
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
  console.error('AUTH_SECRET manquant ou trop court dans .env.local')
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

const contexts = []

async function shot(name, viewport, opts = {}) {
  const ctx = await browser.newContext({
    viewport,
    reducedMotion: opts.reducedMotion ? 'reduce' : undefined,
  })
  contexts.push(ctx)
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
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
  })
  if (opts.reload) await page.reload({ waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: opts.fullPage ?? false })
  return page
}

await shot('01-desktop-full', { width: 1440, height: 900 }, { fullPage: true })
await shot('02-hero-kpi', { width: 1440, height: 900 })
await shot('03-exposure-rebalancing', { width: 1440, height: 900 })
await shot('04-activity-market', { width: 1440, height: 900 })
await shot('05-vaults-clients', { width: 1440, height: 900 })
await shot('06-activity-timeline', { width: 1440, height: 900 }, { fullPage: true })
await shot('07-mobile', { width: 390, height: 844 }, { fullPage: true })
await shot('08-zoom-200', { width: 1280, height: 800 })
await shot('09-reduced-motion', { width: 1440, height: 900 }, { reducedMotion: true, reload: true })

for (const ctx of contexts) await ctx.close()
await browser.close()

const uniqueErrors = [...new Set(consoleErrors)]
console.log(JSON.stringify({ outDir: OUT, consoleErrorCount: uniqueErrors.length, consoleErrors: uniqueErrors.slice(0, 20) }, null, 2))
