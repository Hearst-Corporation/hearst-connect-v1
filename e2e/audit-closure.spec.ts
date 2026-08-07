import { test, expect, type Page } from '@playwright/test'

/**
 * Fermeture audit ENDPOINTS-DATA-DISPLAY-001 — LOT 3/6.
 * Parcours réel : routes clés, libellés honnêtes, focus clavier minimal.
 */

const ROUTES_AUDIT = [
  '/admin',
  '/admin/runtime',
  '/admin/produit',
  '/admin/vaults',
] as const

async function quickLogin(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test.describe('audit closure — vérité affichée', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page)
  })

  test('dashboard lit meta.status (plus « joignable » générique)', async ({ page }) => {
    await page.goto('/admin')
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('Source du tableau de bord joignable')
    expect(body).toMatch(/en direct|indisponible|obsolète|partiel/i)
  })

  test('runtime expose la matrice d’état et l’indexeur', async ({ page }) => {
    await page.goto('/admin/runtime')
    await expect(page.getByRole('heading', { name: 'État du service' })).toBeVisible()
    await expect(page.getByText('Matrice d’état')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Indexeur', exact: true })).toBeVisible()
  })

  test('produit affiche la vue consolidée', async ({ page }) => {
    await page.goto('/admin/produit')
    await expect(page.getByRole('heading', { name: 'Vue produit consolidée' })).toBeVisible()
    await expect(page.getByText('Lectures consolidées du produit')).toBeVisible()
  })
})

test.describe('audit closure — layout et focus', () => {
  test('chaque route audit a un h1 et pas de scroll horizontal document', async ({ page }) => {
    await quickLogin(page)
    for (const route of ROUTES_AUDIT) {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(route)
      await expect(page.locator('h1').first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      expect(overflow, `scroll horizontal sur ${route}`).toBeFalsy()
    }
  })

  test('tab atteint un lien ou bouton focusable sur le dashboard', async ({ page }) => {
    await quickLogin(page)
    await page.goto('/admin')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '')
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused)
  })
})
