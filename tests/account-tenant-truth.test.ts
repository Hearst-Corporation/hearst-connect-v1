import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

/**
 * P0 tenant-truth on /account: global (vault/fund) data must never be presented
 * as the client's, and the client's own data must not be silently dropped.
 * SESSION OWNS CLIENT IDENTITY · GLOBAL DATA NEVER FALLS BACK INTO CLIENT DATA ·
 * VAULT VALUE != CLIENT POSITION VALUE.
 */
describe('account movements — no global-as-client fallback', () => {
  const load = read('src/features/user-dashboard/load.ts')

  it('client activity never falls back to the global recentEvents feed', () => {
    // The `movementsFrom(activity) ?? movementsFrom(recentEvents)` fallback is gone.
    expect(load).not.toMatch(/movementsFrom\(eventsField\.value\)/)
    expect(load).not.toMatch(/\?\?\s*movementsFrom\(/)
    // recentEvents is not read at all for the account movements path.
    expect(load).not.toContain("surface(aggregate, 'recentEvents')")
    // Activity is the caller's own field only.
    expect(load).toContain('const activityValue = movementsFrom(activityField.value)')
  })
})

describe('account KPIs — client vs fund are named', () => {
  const view = read('src/features/user-dashboard/user-dashboard.tsx')
  const load = read('src/features/user-dashboard/load.ts')

  it('the account value tile is the CLIENT position, never the vault AUM', () => {
    expect(view).toContain('label="Position value"')
    expect(view).toContain('signal={signalOf(data.positionValue)}')
    // The old vault-AUM-as-account-value tile is gone.
    expect(view).not.toContain('label="Vault value"')
  })

  it('the client position book value is parsed and exposed (no longer dropped)', () => {
    expect(load).toContain('positionBookFrom')
    expect(load).toContain('positionValue')
    // Book value only — never shares × NAV (shares are null).
    expect(load).not.toMatch(/shares\s*\*\s*nav/i)
  })

  it('fund-global metrics carry an explicit fund scope in their label', () => {
    expect(view).toContain('label="Fund utilization"')
    expect(view).toContain('label="Fund capacity left"')
    expect(view).not.toContain('label="Utilization"')
    expect(view).not.toContain('label="Available capacity"')
  })

  it('vault-global context (allocation, central activity) is named vault, not account', () => {
    expect(view).toContain('title="Vault allocation"')
    expect(view).toContain("question: 'Vault activity'")
    expect(view).not.toContain("question: 'Account activity'")
  })

  it('strategy exposure stays explicitly "% of vault" (product/vault scope)', () => {
    expect(view).toContain('% of vault')
    // Never reframed as the client's own allocation (no ClientStrategyAllocation yet).
    expect(view).not.toMatch(/Your (strategy )?allocation/i)
  })
})
