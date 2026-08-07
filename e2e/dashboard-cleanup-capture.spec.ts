/**
 * Captures HC-ADMIN-DASHBOARD-VISUAL-CLEANUP-003 — terminal only.
 * Usage: pnpm exec playwright test e2e/dashboard-cleanup-capture.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SORTIE = 'docs/visual-reviews/HC-ADMIN-DASHBOARD-VISUAL-CLEANUP-003'

async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test('dashboard visual cleanup captures', async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(SORTIE, { recursive: true })

  const erreursConsole: string[] = []
  const echecsReseau: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(m.text())
  })
  page.on('requestfailed', (r) => {
    const raison = r.failure()?.errorText ?? 'inconnu'
    if (raison === 'net::ERR_ABORTED' && new URL(r.url()).pathname === '/login') return
    echecsReseau.push(`${r.url()} :: ${raison}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })

  // Rejection checks on the live DOM (main surface — not the global sidebar hubs)
  const main = page.locator('[data-dashboard="pilotage"]')
  const mainText = await main.innerText()
  expect(mainText).not.toMatch(/proxy wallet/i)
  expect(mainText).not.toMatch(/GET \/api/)
  expect(mainText).not.toMatch(/Comptes présents dans le registre/)
  expect(await page.getByLabel('Sous-navigation').count()).toBe(0)
  expect(await page.locator('[data-dashboard="pilotage"]').count()).toBe(1)
  expect(await page.locator('[data-widget="subscription-journey"]').count()).toBe(1)
  expect(await page.locator('[data-widget="action-queue"], [data-widget="source-status-grid"]').count()).toBeGreaterThan(0)
  // No technical "En direct" badges on the pilotage surface
  const liveBadges = main.getByText('En direct', { exact: true })
  expect(await liveBadges.count()).toBe(0)

  // No gray bag: pilotage sits on Catalyst white panel
  const shellBg = await page.evaluate(() => {
    const el = document.querySelector('[data-dashboard="pilotage"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })
  expect(shellBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/)

  await page.screenshot({ path: join(SORTIE, 'after-desktop-1440x900.png'), fullPage: false })
  await page.screenshot({ path: join(SORTIE, 'after-desktop-full.png'), fullPage: true })

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(SORTIE, 'after-laptop-1280x800.png'), fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(SORTIE, 'after-mobile-390x844.png'), fullPage: false })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await page.screenshot({ path: join(SORTIE, 'after-zoom-200.png'), fullPage: false })

  writeFileSync(
    join(SORTIE, 'browser-report.json'),
    JSON.stringify(
      {
        url: page.url(),
        h1: await page.locator('h1').allTextContents(),
        bodyBg: await page.evaluate(() => {
          const el = document.querySelector('[data-dashboard="pilotage"]')
          return el ? getComputedStyle(el).backgroundColor : null
        }),
        panelBg: await page.evaluate(() => {
          const el = document.querySelector('main .grow')
          return el ? getComputedStyle(el).backgroundColor : null
        }),
        consoleErrors: erreursConsole,
        networkFails: echecsReseau,
        liveBadgeCount: await liveBadges.count(),
        hasFunnel: (await page.locator('[data-widget="subscription-journey"]').count()) > 0,
        hasSources: (await page.locator('[data-widget="source-status-grid"]').count()) > 0,
      },
      null,
      2,
    ),
  )

  expect(erreursConsole, `console errors: ${erreursConsole.join(' | ')}`).toEqual([])
})
