import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end suite (TEST-02/04/05).
 *
 * The audit found Playwright installed but exercised by no suite: the console's
 * real behaviors — an anonymous visitor refused from /admin, a forged session
 * rejected, a Server Action refusing an anonymous caller — were never proven in
 * a browser. This config runs those journeys against a real dev server.
 *
 * The specs live in the e2e directory with a .spec.ts suffix, deliberately
 * outside the vitest test glob, so the two runners never collide.
 *
 * Auth uses the dev quick-login, authenticated against the real backend — the
 * real owner password is never typed into a browser.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'e2e-report.json' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
