/**
 * HC-BROWSER-PRODUCTION-PARITY-024 — authenticated local admin browser QA.
 * Usage: E2E_PORT=4105 node scripts/capture-browser-parity-024.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../.validation-024')
mkdirSync(OUT, { recursive: true })

const PORT = process.env.E2E_PORT ?? '4105'
const BASE = `http://localhost:${PORT}`

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
const email = env.DEV_QUICK_LOGIN_EMAIL
const password = env.DEV_QUICK_LOGIN_PASSWORD
if (!email || !password) {
  console.error('DEV_QUICK_LOGIN_EMAIL/PASSWORD missing in .env.local')
  process.exit(1)
}

const STATIC_ROUTES = [
  '/admin',
  '/admin/clients',
  '/admin/vaults',
  '/admin/compliance',
  '/admin/operations',
  '/admin/product',
  '/admin/series-1',
  '/admin/runtime',
  '/admin/profile',
]

const VIEWPORTS = [
  { id: '1440', width: 1440, height: 900 },
  { id: '1280', width: 1280, height: 800 },
  { id: 'mobile-390', width: 390, height: 844 },
  { id: 'zoom-200', width: 1280, height: 800, deviceScaleFactor: 2 },
  { id: 'reduced-motion', width: 1440, height: 900, reducedMotion: 'reduce' },
]

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 90_000 })
}

async function discoverVaultId(page) {
  await page.goto(`${BASE}/admin/vaults`, { waitUntil: 'networkidle', timeout: 120_000 })
  const href = await page.locator('a[href^="/admin/vaults/"]').first().getAttribute('href').catch(() => null)
  if (href === null) return null
  const m = href.match(/^\/admin\/vaults\/([^/?#]+)/)
  return m?.[1] ?? null
}

const report = {
  mission: 'HC-BROWSER-PRODUCTION-PARITY-024',
  base: BASE,
  startedAt: new Date().toISOString(),
  routes: [],
  viewports: VIEWPORTS.map((v) => v.id),
  consoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  hydrationWarnings: [],
  bugs: [],
}

let browser
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' })
} catch {
  browser = await chromium.launch({ headless: true })
}

const probeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const probePage = await probeCtx.newPage()
await login(probePage)
const vaultId = await discoverVaultId(probePage)
await probeCtx.close()

const routes = [...STATIC_ROUTES]
if (vaultId !== null) routes.push(`/admin/vaults/${vaultId}`)

for (const route of routes) {
  report.routes.push({ route, viewports: {} })
}
const routeIndex = new Map(routes.map((r, i) => [r, i]))

for (const vp of VIEWPORTS) {
  const vpCtx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor ?? 1,
    reducedMotion: vp.reducedMotion ?? 'no-preference',
  })
  const vpPage = await vpCtx.newPage()
  vpPage.on('console', (m) => {
    const text = m.text()
    if (m.type() === 'error') report.consoleErrors.push(text)
    if (/hydration/i.test(text)) report.hydrationWarnings.push(text)
  })
  vpPage.on('pageerror', (err) => report.pageErrors.push(err.message))
  vpPage.on('response', (res) => {
    const u = res.url()
    if (u.startsWith(BASE) && res.status() >= 500) {
      report.networkFailures.push({ url: u.replace(BASE, ''), status: res.status() })
    }
  })

  await login(vpPage)

  for (const route of routes) {
    const vpConsole = []
    const vpPageErrors = []
    const onConsole = (m) => {
      if (m.type() === 'error') vpConsole.push(m.text())
    }
    const onPageError = (e) => vpPageErrors.push(e.message)
    vpPage.on('console', onConsole)
    vpPage.on('pageerror', onPageError)

    const resp = await vpPage.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 120_000 })
    await vpPage.evaluate(() => {
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    const status = resp?.status() ?? 0
    const globalError = await vpPage
      .getByRole('heading', { name: /Unable to load this page/i })
      .isVisible()
      .catch(() => false)
    const h1Visible = await vpPage.locator('h1').first().isVisible().catch(() => false)
    const shotName = `${route.replace(/\//g, '_').replace(/^_/, '')}-${vp.id}.png`
    await vpPage.screenshot({ path: resolve(OUT, shotName), fullPage: vp.id === 'mobile-390' })

    const entry = report.routes[routeIndex.get(route)]
    entry.viewports[vp.id] = {
      httpStatus: status,
      globalError,
      h1Visible,
      consoleErrors: [...new Set(vpConsole)],
      pageErrors: [...new Set(vpPageErrors)],
      screenshot: shotName,
    }

    if (status === 404) report.bugs.push({ route, viewport: vp.id, kind: 'unexpected_404' })
    if (status >= 500) report.bugs.push({ route, viewport: vp.id, kind: 'unexpected_5xx', status })
    if (globalError) report.bugs.push({ route, viewport: vp.id, kind: 'global_error_shell' })
    if (vpConsole.length > 0) report.bugs.push({ route, viewport: vp.id, kind: 'console_error', count: vpConsole.length })
    if (vpPageErrors.length > 0) report.bugs.push({ route, viewport: vp.id, kind: 'page_error', count: vpPageErrors.length })

    vpPage.off('console', onConsole)
    vpPage.off('pageerror', onPageError)
  }

  await vpCtx.close()
}

await browser.close()

report.finishedAt = new Date().toISOString()
report.consoleErrors = [...new Set(report.consoleErrors)]
report.pageErrors = [...new Set(report.pageErrors)]
report.hydrationWarnings = [...new Set(report.hydrationWarnings)]
report.pass =
  report.bugs.length === 0 &&
  report.consoleErrors.length === 0 &&
  report.pageErrors.length === 0 &&
  report.hydrationWarnings.length === 0

writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ pass: report.pass, bugs: report.bugs.length, outDir: OUT, vaultId }, null, 2))
process.exit(report.pass ? 0 : 1)
