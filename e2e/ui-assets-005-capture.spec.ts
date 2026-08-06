/**
 * Captures + rejets HC-ADMIN-DASHBOARD-UI-ASSETS-005 — terminal only.
 * Usage : E2E_PORT=4105 pnpm exec playwright test e2e/ui-assets-005-capture.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'docs/visual-reviews/HC-ADMIN-DASHBOARD-UI-ASSETS-005'

async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test('UI-ASSETS-005 dashboard captures + rejection checks', async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(OUT, { recursive: true })

  const consoleErrors: string[] = []
  const networkFails: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('requestfailed', (r) => {
    const raison = r.failure()?.errorText ?? 'inconnu'
    if (raison === 'net::ERR_ABORTED' && new URL(r.url()).pathname === '/login') return
    networkFails.push(`${r.url()} :: ${raison}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })

  const main = page.locator('[data-dashboard="pilotage"]')

  // ── Rejets §14 : le stepper remplace le faux funnel, la file est une composition
  expect(await page.locator('[data-widget="subscription-journey"]').count(), 'stepper présent').toBe(1)
  expect(await page.locator('[data-widget="funnel-columns"]').count(), 'six barres supprimées').toBe(0)
  expect(await page.locator('[data-widget="subscription-journey"] [role="tab"]').count(), '6 étapes').toBe(6)
  expect(await page.locator('[data-widget="action-queue"]').count(), 'À traiter reconstruit').toBe(1)
  // Pas de fuite d'endpoint sur la surface pilotage
  const mainText = await main.innerText()
  expect(mainText).not.toMatch(/GET \/api/)

  // Primaire visible mais désactivé + honnête (§8)
  const addClient = page.getByRole('button', { name: /Ajouter un client/ })
  expect(await addClient.isDisabled(), 'Ajouter un client désactivé (pas d’endpoint)').toBe(true)

  // ── Captures
  await page.screenshot({ path: join(OUT, 'dashboard-desktop-1440x900.png'), fullPage: false, animations: "disabled" })
  await page.screenshot({ path: join(OUT, 'dashboard-desktop-full.png'), fullPage: true, animations: "disabled" })

  const stepperCard = page.locator('section', { has: page.locator('[data-widget="subscription-journey"]') })
  await stepperCard.screenshot({ path: join(OUT, 'stepper-kyc-open.png'), animations: 'disabled' })

  // Sélection d'une autre étape → le panneau de détail change (interaction réelle)
  await page.locator('[data-widget="subscription-journey"] [role="tab"]').nth(2).click()
  await expect(page.getByText('Wallet actif')).toBeVisible()
  await stepperCard.screenshot({ path: join(OUT, 'stepper-wallet-selected.png'), animations: 'disabled' })

  const queueCard = page.locator('section', { has: page.locator('[data-widget="action-queue"]') })
  await queueCard.screenshot({ path: join(OUT, 'a-traiter-panel.png'), animations: 'disabled' })

  // Bouton principal — visible + désactivé + tooltip honnête (§15)
  await addClient.scrollIntoViewIfNeeded()
  await addClient.screenshot({ path: join(OUT, 'primary-disabled.png'), animations: 'disabled' })

  // ── Laptop
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(OUT, 'dashboard-laptop-1280x800.png'), fullPage: false, animations: "disabled" })

  // ── Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(OUT, 'dashboard-mobile-390x844.png'), fullPage: false, animations: "disabled" })
  await page.screenshot({ path: join(OUT, 'dashboard-mobile-full.png'), fullPage: true, animations: "disabled" })

  // ── Zoom 200 %
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await page.screenshot({ path: join(OUT, 'dashboard-zoom-200.png'), fullPage: false, animations: 'disabled' })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1'
  })

  // ── Reduced motion (le stepper/actions rendent sans animation)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-widget="subscription-journey"]')).toBeVisible()
  await page.screenshot({ path: join(OUT, 'dashboard-reduced-motion.png'), fullPage: false, animations: "disabled" })
  await page.emulateMedia({ reducedMotion: null })

  writeFileSync(
    join(OUT, 'browser-report.json'),
    JSON.stringify(
      {
        route: '/admin/dashboard',
        h1: await page.locator('h1').allTextContents(),
        stepperTabs: await page.locator('[data-widget="subscription-journey"] [role="tab"]').count(),
        hasFunnelColumns: (await page.locator('[data-widget="funnel-columns"]').count()) > 0,
        hasActionQueue: (await page.locator('[data-widget="action-queue"]').count()) > 0,
        addClientDisabled: await page.getByRole('button', { name: /Ajouter un client/ }).isDisabled(),
        consoleErrors,
        networkFails,
      },
      null,
      2,
    ),
  )

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([])
})
