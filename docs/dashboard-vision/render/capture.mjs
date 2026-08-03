/**
 * Captures the concept mockups at exact viewport size.
 * Standalone: reads only the two HTML files next to it, writes two PNGs one level up.
 *   node docs/dashboard-vision/render/capture.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..')

const SHOTS = [
  { file: 'dashboard-desktop.html', png: 'dashboard-concept-desktop.png', width: 1920, height: 1080 },
  { file: 'dashboard-mobile.html', png: 'dashboard-concept-mobile.png', width: 390, height: 844 },
]

const browser = await chromium.launch()
for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
  })
  await page.goto(`file://${join(here, shot.file)}`)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  // Report any overflow beyond the viewport — a scrollbar is a defect here.
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    clientW: document.documentElement.clientWidth,
    clientH: document.documentElement.clientHeight,
  }))
  console.log(shot.png, JSON.stringify(overflow))

  await page.screenshot({ path: join(out, shot.png) })
  await page.close()
}
await browser.close()
console.log('done')
