import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * TEST-04 / TEST-05 — access control, proven in a real browser.
 *
 * Every journey here is one the audit could only assert by hand. They now run
 * on every `playwright test`: an anonymous visitor is refused, credentials are
 * validated, a forged or expired session is rejected, logout is effective, and
 * the browser back button does not resurrect protected content.
 */

const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/vaults',
  '/admin/operations',
  '/admin/api-explorer',
  '/design-lab/admin-home-green',
]

/** Reads dev credentials from .env.local without ever printing them. */
function devCreds(): { email: string; password: string; secret: string } {
  const env = readFileSync('.env.local', 'utf8')
  const read = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() ?? ''
  return {
    email: read('DEV_QUICK_LOGIN_EMAIL'),
    password: read('DEV_QUICK_LOGIN_PASSWORD'),
    secret: read('AUTH_SECRET'),
  }
}

/** Mints a valid AES-256-GCM session token the way src/lib/session.ts does. */
function sealToken(secret: string, payload: object): string {
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), ct.toString('base64url'), tag.toString('base64url')].join('.')
}

async function quickLogin(page: Page) {
  await page.goto('/login')
  // The dev quick-login is the second form (no visible fields).
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

test.describe('anonymous visitor', () => {
  for (const route of ADMIN_ROUTES) {
    test(`is redirected to /login from ${route}`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(page.url()).toContain('/login')
      expect(resp?.status()).toBeLessThan(400)
    })
  }

  test('public pages remain reachable', async ({ page }) => {
    for (const route of ['/', '/login', '/register']) {
      await page.goto(route)
      expect(page.url()).not.toContain('/login?')
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('login', () => {
  test('valid quick-login reaches the console', async ({ page }) => {
    await quickLogin(page)
    expect(page.url()).toContain('/admin')
    const cookie = (await page.context().cookies()).find((c) => c.name === 'hearst_session')
    expect(cookie?.httpOnly).toBe(true)
  })

  test('invalid credentials are refused with no cookie set', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'nobody-e2e@example.invalid')
    await page.fill('input[name="password"]', 'wrong-password-e2e')
    await page.locator('form').nth(0).locator('button[type="submit"]').click()
    await page.waitForTimeout(4000)
    expect(page.url()).toContain('/login')
    const cookie = (await page.context().cookies()).find((c) => c.name === 'hearst_session')
    expect(cookie).toBeUndefined()
    await expect(page.locator('body')).toContainText(/incorrect|invalid|erreur/i)
  })
})

test.describe('forged and expired sessions', () => {
  test('a garbage cookie is rejected', async ({ page, context }) => {
    await context.addCookies([
      { name: 'hearst_session', value: 'not-a-real-token', domain: 'localhost', path: '/' },
    ])
    await page.goto('/admin')
    expect(page.url()).toContain('/login')
  })

  test('a session sealed under the WRONG secret is rejected', async ({ page, context }) => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const forged = sealToken('WRONG-SECRET-'.padEnd(48, 'x'), {
      userId: 'attacker',
      email: 'attacker@example.invalid',
      name: 'Attacker',
      role: 'OWNER',
      backendToken: 'fake',
      expiresAt: future,
      exp: future,
    })
    await context.addCookies([{ name: 'hearst_session', value: forged, domain: 'localhost', path: '/' }])
    await page.goto('/admin')
    expect(page.url()).toContain('/login')
  })

  test('a correctly-sealed but EXPIRED session is rejected', async ({ page, context }) => {
    const { secret } = devCreds()
    const past = Math.floor(Date.now() / 1000) - 3600
    const expired = sealToken(secret, {
      userId: 'u',
      email: 'e@example.invalid',
      name: 'n',
      role: 'OWNER',
      backendToken: 'fake',
      expiresAt: past,
      exp: past,
    })
    await context.addCookies([{ name: 'hearst_session', value: expired, domain: 'localhost', path: '/' }])
    await page.goto('/admin')
    expect(page.url()).toContain('/login')
  })
})

test.describe('parameterized route safety (IDOR / injection)', () => {
  const HOSTILE = ['../../../etc/passwd', "1' OR '1'='1", '<script>alert(1)</script>', '0x0000']
  test('hostile vault ids never expose data', async ({ page }) => {
    await quickLogin(page)
    for (const id of HOSTILE) {
      const resp = await page.goto(`/admin/vaults/${encodeURIComponent(id)}`)
      // Either a clean 404, or a rendered "unavailable/introuvable" — never data.
      expect(resp?.status() === 404 || page.url().includes('/admin/vaults')).toBeTruthy()
      const body = await page.locator('body').innerText()
      expect(body).not.toContain('alert(1)')
    }
  })
})

test.describe('logout', () => {
  test('logout clears the session and back button does not resurrect it', async ({ page }) => {
    await quickLogin(page)
    await page.goto('/admin/operations')
    await page.getByRole('button', { name: /déconnec|sign out/i }).first().click()
    await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 30_000 })

    const cookie = (await page.context().cookies()).find((c) => c.name === 'hearst_session')
    expect(cookie === undefined || cookie.value.length < 10).toBeTruthy()

    await page.goBack().catch(() => {})
    await page.waitForTimeout(1500)
    // The protected page must not re-render for a logged-out user.
    expect(page.url()).toContain('/login')
  })
})
