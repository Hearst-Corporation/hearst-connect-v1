/**
 * Captures visuelles HC-ADMIN-DASHBOARD-002
 * Usage: node scripts/visual-review-capture.mjs
 * Prérequis: dev server sur :3000, .env.local avec identifiants owner
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const OUT = join(process.cwd(), 'docs/visual-reviews/HC-ADMIN-DASHBOARD-002')
const BASE = process.env.REVIEW_BASE_URL ?? 'http://localhost:3000'
const EMAIL = process.env.ADRIEN_OWNER_EMAIL ?? process.env.DEV_QUICK_LOGIN_EMAIL
const PASSWORD = process.env.ADRIEN_OWNER_PASSWORD ?? process.env.DEV_QUICK_LOGIN_PASSWORD

const SHOTS = [
  { file: 'after-home-desktop-1440x900.png', path: '/admin', width: 1440, height: 900 },
  { file: 'after-home-laptop-1280x800.png', path: '/admin', width: 1280, height: 800 },
  { file: 'after-home-mobile-375x812.png', path: '/admin', width: 375, height: 812 },
  { file: 'clients-desktop.png', path: '/admin/clients', width: 1440, height: 900 },
  { file: 'conformite-desktop.png', path: '/admin/conformite', width: 1440, height: 900 },
  { file: 'operations-desktop.png', path: '/admin/operations', width: 1440, height: 900 },
  { file: 'administration-desktop.png', path: '/admin/administration', width: 1440, height: 900 },
  { file: 'runtime-desktop.png', path: '/admin/runtime', width: 1440, height: 900 },
  { file: 'api-explorer-desktop.png', path: '/admin/api-explorer', width: 1440, height: 900 },
]

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Identifiants manquants : ADRIEN_OWNER_EMAIL/PASSWORD ou DEV_QUICK_LOGIN_*')
    process.exit(1)
  }

  await mkdir(OUT, { recursive: true })

  const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()

  // Charger playwright dynamiquement
  const { chromium } = await import('playwright')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Login
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin**', { timeout: 30000 })

  const manifest = {
    mission: 'HC-ADMIN-DASHBOARD-002',
    commit,
    baseUrl: BASE,
    capturedAt: new Date().toISOString(),
    backend: process.env.HEARST_API_URL ?? 'from .env.local',
    screenshots: [],
    notes: {
      smartContracts: 'Pas de capture smart-contracts-desktop.png — aucune surface dédiée ; lectures via /admin/vault et /admin/series-1',
    },
  }

  for (const shot of SHOTS) {
    await page.setViewportSize({ width: shot.width, height: shot.height })
    await page.goto(`${BASE}${shot.path}`)
    await page.waitForTimeout(1500)
    const path = join(OUT, shot.file)
    await page.screenshot({ path, fullPage: shot.height > 1000 ? false : true })
    manifest.screenshots.push({
      file: shot.file,
      route: shot.path,
      viewport: `${shot.width}x${shot.height}`,
      commit,
    })
    console.log(`✓ ${shot.file}`)
  }

  // Before shot from prior mission if exists
  const beforeSrc = join(process.cwd(), 'docs/visual-reviews/HC-BRAND-ALIGN-001/before-admin-desktop.png')
  try {
    await import('node:fs').then((fs) => fs.copyFileSync(beforeSrc, join(OUT, 'before-home-desktop.png')))
    manifest.screenshots.unshift({ file: 'before-home-desktop.png', route: '/admin', note: 'copie HC-BRAND-ALIGN-001' })
  } catch {
    await page.setViewportSize({ width: 1440, height: 900 })
    manifest.screenshots.unshift({ file: 'before-home-desktop.png', route: '/admin', note: 'non disponible' })
  }

  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('Manifest écrit.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
