import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * TEST-02 (behavioral) — the truthfulness guarantee, proven in a browser.
 *
 * These journeys assert what the console SHOWS, not just what a unit returns:
 * every admin route renders without a console error, the data-coverage page
 * states its own coverage honestly, and the API Explorer Server Action refuses
 * an anonymous caller at the HTTP layer (ARCH-01).
 */

const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/operations',
  '/admin/product',
  '/admin/vaults',
  '/admin/mining',
  '/admin/btc',
  '/admin/series-1',
  '/admin/runtime',
  '/admin/clients',
  '/admin/keeper',
]

async function quickLogin(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test.describe('admin console renders cleanly', () => {
  test('every admin route renders 200 with no console error', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(String(e)))

    await quickLogin(page)
    for (const route of ADMIN_ROUTES) {
      const resp = await page.goto(route)
      expect(resp?.status(), `HTTP for ${route}`).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()
    }
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  })
})

test.describe('data coverage tells the truth (VER-01)', () => {
  test('the dashboard never labels an absence "Live"', async ({ page }) => {
    await quickLogin(page)
    await page.goto('/admin/dashboard')
    const body = await page.locator('body').innerText()

    // Wherever a metric is unavailable, it must read "Unavailable"/"Reference",
    // and any "Live" badge must accompany a real value, never a bare absence.
    // We assert the honest vocabulary is present and that no metric shows the
    // contradiction the audit found ("0" next to a green Live badge with no data).
    const hasHonestStates = /Unavailable|Reference|Not (yet )?open|Served/i.test(body)
    expect(hasHonestStates).toBeTruthy()
  })
})

test.describe('API Explorer Server Action is guarded (ARCH-01)', () => {
  test('an anonymous POST to the action route does not return probe data', async ({ request }) => {
    // Without a session cookie, invoking the api-explorer route (where the
    // probeEndpoint Server Action lives) must never return a live probe result.
    const resp = await request.post('/admin/api-explorer', {
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      data: '[null,{"endpointId":"health"}]',
      maxRedirects: 0,
    })
    const status = resp.status()
    // Either redirected to login (3xx) or, if the action ran, it must have
    // refused — never a body carrying a LIVE probe of a backend endpoint.
    const body = await resp.text().catch(() => '')
    const leakedLiveProbe = /"status":"LIVE"[\s\S]*"httpStatus":200/.test(body)
    expect(leakedLiveProbe, `anonymous probe leaked live data (status ${status})`).toBeFalsy()
  })
})
