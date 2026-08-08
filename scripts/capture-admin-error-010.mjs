/**
 * HC-ADMIN-ERROR-STATE-INTEGRATION-010 — before/after error boundary captures.
 * Usage: node scripts/capture-admin-error-010.mjs [before|after]
 * Injects a local-only throw into /admin page, then restores. Never commit the patch.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const phase = process.argv[2] === 'after' ? 'after' : 'before'
const OUT = resolve(__dirname, `../.validation-010/${phase}`)
mkdirSync(OUT, { recursive: true })

const PORT = process.env.E2E_PORT ?? '4105'
const BASE = `http://localhost:${PORT}`
const PAGE_PATH = resolve(__dirname, '../src/app/admin/page.tsx')
const ERROR_PATH = resolve(__dirname, '../src/app/admin/error.tsx')
const originalPage = readFileSync(PAGE_PATH, 'utf8')
const newError = readFileSync(ERROR_PATH, 'utf8')
const oldError = execSync('git show HEAD:src/app/admin/error.tsx', {
  cwd: resolve(__dirname, '..'),
  encoding: 'utf8',
})
writeFileSync(ERROR_PATH, phase === 'before' ? oldError : newError, 'utf8')

const FORCED_PAGE = originalPage.replace(
  /const session = await requireSession\(\)/,
  `throw new Error('HC-ADMIN-ERROR-STATE-INTEGRATION-010 forced boundary probe')\n  const session = await requireSession()`,
)

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
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'))
}

function createSessionCookie(session) {
  const key = createHash('sha256').update(authSecret).digest()
  const payload = { ...session, exp: session.expiresAt }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.')
}

async function buildSession(backendToken) {
  const payload = decodeTokenPayload(backendToken)
  return {
    userId: payload.userId,
    email: 'admin@local',
    name: 'admin',
    role: 'OWNER',
    backendToken,
    expiresAt: payload.exp,
  }
}

writeFileSync(PAGE_PATH, FORCED_PAGE, 'utf8')

const backendToken = mintLocalAdminToken()
const cookieValue = createSessionCookie(await buildSession(backendToken))

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
    deviceScaleFactor: opts.zoom ? 2 : 1,
    reducedMotion: opts.reducedMotion ? 'reduce' : undefined,
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
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
  })
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: opts.fullPage ?? false })

  const sidebarVisible = await page.getByRole('link', { name: 'Vaults' }).isVisible().catch(() => false)
  const hasUnable = await page.getByRole('heading', { name: 'Unable to load this page' }).isVisible().catch(() => false)
  const hasTryAgain = await page.getByRole('button', { name: 'Try again' }).isVisible().catch(() => false)

  await ctx.close()
  return { sidebarVisible, hasUnable, hasTryAgain }
}

const checks = {
  desktop1440: await shot('01-desktop-1440', { width: 1440, height: 900 }, { fullPage: true }),
  desktop1280: await shot('02-desktop-1280', { width: 1280, height: 800 }),
  mobile: await shot('03-mobile-390', { width: 390, height: 844 }, { fullPage: true }),
  zoom200: await shot('04-zoom-200', { width: 1280, height: 800 }, { zoom: true }),
}

writeFileSync(PAGE_PATH, originalPage, 'utf8')
writeFileSync(ERROR_PATH, newError, 'utf8')
await browser.close()

const uniqueErrors = [...new Set(consoleErrors)].filter((e) => !e.includes('forced boundary probe'))
console.log(
  JSON.stringify(
    {
      phase,
      outDir: OUT,
      checks,
      consoleErrorCount: uniqueErrors.length,
      consoleErrors: uniqueErrors.slice(0, 10),
    },
    null,
    2,
  ),
)
