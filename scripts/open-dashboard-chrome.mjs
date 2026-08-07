/**
 * Ouvre Google Chrome sur le dashboard admin local, connecté + thème sombre.
 * Usage: node scripts/open-dashboard-chrome.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.E2E_PORT ? `http://localhost:${process.env.E2E_PORT}` : 'http://localhost:4105'
const DASHBOARD = `${BASE}/admin`

let browser
try {
  browser = await chromium.launch({ headless: false, channel: 'chrome' })
} catch {
  browser = await chromium.launch({ headless: false })
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })

const quickForm = page.locator('form').nth(1)
const quickButton = quickForm.locator('button[type="submit"]')
if ((await quickButton.count()) > 0) {
  await quickButton.click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
} else {
  console.error('Connexion rapide dev indisponible — remplir DEV_QUICK_LOGIN_* dans .env.local')
  process.exit(1)
}

await page.evaluate(() => {
  localStorage.setItem('theme', 'dark')
  document.documentElement.classList.remove('light')
  document.documentElement.classList.add('dark')
})

await page.goto(DASHBOARD, { waitUntil: 'networkidle' })

console.log(`Chrome ouvert sur ${DASHBOARD} (thème sombre, session active).`)
console.log('Fermez la fenêtre Chrome pour terminer ce script.')

await page.waitForEvent('close', { timeout: 0 }).catch(() => {})
await browser.close().catch(() => {})
