import { test, expect, type Page } from '@playwright/test'

/**
 * Audit closure — key routes, honest labels, minimal keyboard focus.
 */

const ROUTES_AUDIT = [
  '/admin',
  '/admin/runtime',
  '/admin/product',
  '/admin/vaults',
] as const

async function quickLogin(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test.describe('audit closure — displayed truth', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page)
  })

  test('dashboard surfaces resolved status labels (not a generic reachability phrase)', async ({ page }) => {
    await page.goto('/admin')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Source du tableau de bord joignable/i)
    expect(body).toMatch(/Live|Stale|Partial|Unavailable/i)
  })

  test('runtime exposes the system overview matrix and indexer row', async ({ page }) => {
    await page.goto('/admin/runtime')
    await expect(page.getByRole('heading', { name: 'Service' })).toBeVisible()
    await expect(page.getByText('System overview')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Indexer', exact: true })).toBeVisible()
  })

  test('product shows the consolidated view', async ({ page }) => {
    await page.goto('/admin/product')
    await expect(page.getByRole('heading', { name: 'Consolidated product view' })).toBeVisible()
    await expect(page.getByText('Mining, BTC, and product factsheet readings')).toBeVisible()
  })
})

test.describe('audit closure — layout and focus', () => {
  test('each audit route has an h1 and no document horizontal scroll', async ({ page }) => {
    await quickLogin(page)
    for (const route of ROUTES_AUDIT) {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(route)
      await expect(page.locator('h1').first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      expect(overflow, `horizontal scroll on ${route}`).toBeFalsy()
    }
  })

  test('tab reaches a focusable link or button on the dashboard', async ({ page }) => {
    await quickLogin(page)
    await page.goto('/admin')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '')
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused)
  })
})
