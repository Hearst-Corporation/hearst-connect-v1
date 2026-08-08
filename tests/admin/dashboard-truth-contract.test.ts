import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  atomicDivisor,
  formatAdminAtomic,
  formatEventAtomic,
} from '@/lib/admin-dashboard/format-atomic'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/load'
import { available, unavailable, signalOf } from '@/lib/vaults/model'

const root = (p: string) => resolve(import.meta.dirname, '../../', p)

describe('admin dashboard — truth contract (HC-023)', () => {
  it('preserves backend NOT_CONFIGURED without treating it as generic unavailable', () => {
    const row = unavailable({ status: 'NOT_CONFIGURED', reason: 'no_telemetry_rows' })
    expect(isAdminNotConfigured(row)).toBe(true)
    expect(isAdminNotConfigured(unavailable({ status: 'UNAVAILABLE' }))).toBe(false)
    expect(isAdminNotConfigured(available([]))).toBe(false)
  })

  it('carries PARTIAL resolution status into stale signal — not automatic LIVE', () => {
    const row = available('42', { provenance: 'live', resolutionStatus: 'PARTIAL' })
    expect(signalOf(row)).toBe('stale')
  })

  it('formats atomic amounts from contract decimals — not hardcoded 1e6', () => {
    expect(atomicDivisor(6)).toBe(1_000_000)
    expect(formatAdminAtomic('1500000', { asset: 'USDC', decimals: 6 })).toBe('$1.5')
    expect(formatAdminAtomic('1500000', { asset: 'USDC', decimals: 8 })).not.toBe('$1,500,000')
  })

  it('formats event amounts via portfolio scale when asset matches', () => {
    const scale = { asset: 'USDC', decimals: 6 }
    expect(formatEventAtomic('2000000', 'USDC', scale)).toBe('$2')
    expect(formatEventAtomic('2000000', 'cbBTC', scale)).toBe('2000000 cbBTC')
  })

  it('data health grid keys by stable backend key', () => {
    const source = readFileSync(root('src/components/admin/dashboard/data-health-grid.tsx'), 'utf8')
    expect(source).toMatch(/byKey/)
    expect(source).toMatch(/'vault'/)
    expect(source).not.toMatch(/byLabel/)
    expect(source).toMatch(/key={key}/)
  })

  it('empty strategy/vault lists are named empty — not unavailable', () => {
    const exposure = readFileSync(root('src/components/admin/dashboard/portfolio-exposure.tsx'), 'utf8')
    const vaults = readFileSync(root('src/components/admin/dashboard/vaults-panel.tsx'), 'utf8')
    expect(exposure).toContain('No strategies measured')
    expect(exposure).not.toContain('Source unavailable')
    expect(vaults).toContain('No vaults reported')
    expect(vaults).not.toContain('Source unavailable')
  })

  it('market panel keeps local widget for NOT_CONFIGURED', () => {
    const market = readFileSync(root('src/components/admin/dashboard/market-panel.tsx'), 'utf8')
    expect(market).toMatch(/isAdminNotConfigured/)
    expect(market).toMatch(/NOT_CONFIGURED/)
    expect(market).toMatch(/Market feed not configured/)
  })

  it('load layer maps backend provenance live — not forced chain', () => {
    const load = readFileSync(root('src/lib/admin-dashboard/load.ts'), 'utf8')
    expect(load).toMatch(/if \(raw === 'live'\) return 'live'/)
    expect(load).not.toMatch(/provenance: 'chain'/)
    expect(load).toMatch(/resolutionStatus/)
  })
})
