/**
 * HC-LANDING-VISUAL-INTEGRATION-026 — landing viewport captures (no auth).
 * Usage: E2E_PORT=4105 node scripts/capture-landing-026.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PORT = process.env.E2E_PORT ?? '4105'
const BASE = `http://127.0.0.1:${PORT}`
const OUT = join(process.cwd(), '.validation-026')

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
]

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })

async function capture(label, pageOpts = {}) {
  const context = await browser.newContext({
    ...pageOpts,
    deviceScaleFactor: pageOpts.deviceScaleFactor ?? 1,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(600)
  const path = join(OUT, `${label}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`wrote ${path}`)
  await context.close()
}

for (const vp of VIEWPORTS) {
  await capture(`landing-${vp.name}`, {
    viewport: { width: vp.width, height: vp.height },
  })
}

await capture('landing-zoom-200', {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})

{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(OUT, 'landing-reduced-motion.png'), fullPage: false })
  console.log('wrote landing-reduced-motion.png')
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 })

  for (const [id, label] of [
    ['#platform-heading', 'landing-1440-platform'],
    ['#features-heading', 'landing-1440-features'],
    ['#doctrine-heading', 'landing-1440-doctrine'],
    ['#cta-heading', 'landing-1440-cta'],
  ]) {
    await page.locator(id).scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(OUT, `${label}.png`), fullPage: false })
    console.log(`wrote ${label}.png`)
  }

  await context.close()
}

await browser.close()
console.log(`Done → ${OUT}`)
