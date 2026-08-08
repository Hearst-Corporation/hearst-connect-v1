/**
 * HC-PRODUCTION-ADMIN-END-TO-END-012 — production /admin capture (no secrets logged).
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../.validation-012')
mkdirSync(OUT, { recursive: true })

const BASE = process.env.PROD_FRONT_URL ?? 'https://hearst-connect-v1.vercel.app'
const API = process.env.PROD_API_URL ?? 'https://hearst-connect-backend-production.up.railway.app'

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
  console.error('DEV_QUICK_LOGIN_* missing')
  process.exit(1)
}

const network = []
const consoleErrors = []

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/admin/, { timeout: 60_000 })
}

let browser
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' })
} catch {
  browser = await chromium.launch({ headless: true })
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))
page.on('response', (res) => {
  const u = res.url()
  if (u.includes('/api/v1/admin/')) {
    network.push({ url: u.replace(API, ''), status: res.status() })
  }
})

await login(page)
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 120_000 })
await page.screenshot({ path: resolve(OUT, '01-admin-1440.png'), fullPage: true })

const globalError = await page.getByRole('heading', { name: 'Unable to load this page' }).isVisible().catch(() => false)
const totalAum = await page.getByText('Total AUM').isVisible().catch(() => false)
const exposure = await page.getByText('Portfolio exposure').isVisible().catch(() => false)

await ctx.close()
await browser.close()

const admin404 = network.filter((n) => n.status === 404).length
console.log(
  JSON.stringify(
    {
      frontUrl: BASE,
      apiUrl: API,
      networkAdminCalls: network.length,
      admin404,
      network,
      globalErrorVisible: globalError,
      totalAumVisible: totalAum,
      exposureVisible: exposure,
      consoleErrorCount: [...new Set(consoleErrors)].length,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 10),
      screenshot: OUT,
    },
    null,
    2,
  ),
)
