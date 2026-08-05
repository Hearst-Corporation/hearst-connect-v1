import { activeVaultCount, estateOverview } from '@/lib/vaults/overview'
import {
  available,
  editorial,
  isAvailable,
  measuredCount,
  signalOf,
  unavailable,
  valueOf,
  vaultId,
  type AdminRegistry,
  type Vault,
} from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * The regression suite for the audit's P0 truthfulness defects (VER-01/02/03/05,
 * VER-09, VER-10). Every test here encodes the ONE distinction the defects
 * erased: a "zero measured" is a value; a "not measurable" is an absence, and
 * they must never render the same. These are the tests that would have caught
 * "Active vaults 0 ● Live" over an unreadable register.
 */

const ADDRESS = '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa'

function vaultOf(status: Vault['status']): Vault {
  return {
    id: vaultId(31337, ADDRESS)!,
    label: 'Series 1',
    chainId: 31337,
    contractAddress: ADDRESS,
    status,
    asset: available({ symbol: 'USDC', decimals: 6 }),
    totalAssetsAtomic: available('1000000000'),
    tvlCapAtomic: available('2000000000'),
    capacityRemainingAtomic: available('1000000000'),
    utilizationBps: available(5000),
    navPerShare: available('1.0'),
    strategies: available([]),
    deployedBps: available(7500),
    worstDriftBps: available(-100),
    rebalancing: unavailable({ reason: 'not_exposed_by_contract' }),
    client: unavailable({ endpoint: '/api/v1/clients', status: 'NOT_EXPOSED' }),
    lastActivityAt: available('2026-07-28T05:52:29.053Z'),
  }
}

describe('VER-05 — active vault count refuses an unreadable register', () => {
  it('an UNREADABLE vault makes the active count NOT MEASURABLE, not zero', () => {
    // This is the exact production state that produced "Active vaults 0 ● Live".
    const count = activeVaultCount(available([vaultOf('UNREADABLE')]))
    expect(isAvailable(count)).toBe(false)
    if (!isAvailable(count)) {
      expect(count.reason).toBe('vault_snapshot_unreadable')
      expect(count.endpoint).toBe('/api/v1/vault')
    }
  })

  it('a mixed register with one unreadable vault is still not measurable', () => {
    const count = activeVaultCount(available([vaultOf('ACTIVE'), vaultOf('UNREADABLE')]))
    expect(isAvailable(count)).toBe(false)
  })

  it('an all-readable register yields a REAL count', () => {
    const count = activeVaultCount(available([vaultOf('ACTIVE'), vaultOf('NO_CODE')]))
    expect(isAvailable(count)).toBe(true)
    expect(valueOf(count)).toBe('1')
  })

  it('an all-readable register with zero active vaults is a MEASURED zero', () => {
    const count = activeVaultCount(available([vaultOf('NO_CODE')]))
    expect(isAvailable(count)).toBe(true)
    expect(valueOf(count)).toBe('0') // zero measured — legitimately shown
  })

  it('an empty register is an absence, not a measured zero', () => {
    const count = activeVaultCount(available([]))
    expect(isAvailable(count)).toBe(false)
    if (!isAvailable(count)) expect(count.reason).toBe('no_vault_in_register')
  })

  it('an unavailable register propagates as unavailable', () => {
    const count = activeVaultCount(unavailable({ endpoint: '/api/v1/vault', status: 'UNAVAILABLE' }))
    expect(isAvailable(count)).toBe(false)
  })
})

describe('VER-05 — the overview surfaces the same honest count', () => {
  const baseRegistry = (vaults: AdminRegistry['vaults']): AdminRegistry => ({
    vaults,
    clients: unavailable({}),
    clientExceptions: unavailable({}),
    deployments: unavailable({}),
    compliance: unavailable({}),
    movements: available([]),
    rebalancing: unavailable({}),
    sources: [],
  })

  it('estateOverview.activeVaults is unavailable when a vault is unreadable', () => {
    const overview = estateOverview(baseRegistry(available([vaultOf('UNREADABLE')])))
    expect(isAvailable(overview.activeVaults)).toBe(false)
  })
})

describe('VER-10 — measuredCount propagates absence, never fabricates zero', () => {
  it('an unavailable source yields an unavailable count', () => {
    const count = measuredCount(unavailable({ endpoint: '/api/v1/series1/events', status: 'UNAVAILABLE' }))
    expect(isAvailable(count)).toBe(false)
  })

  it('a genuinely empty list yields a measured "0"', () => {
    const count = measuredCount(available([] as readonly unknown[]))
    expect(isAvailable(count)).toBe(true)
    expect(valueOf(count)).toBe('0')
  })

  it('a populated list yields its real length', () => {
    const count = measuredCount(available([1, 2, 3] as readonly number[]))
    expect(valueOf(count)).toBe('3')
  })
})

describe('VER-09 — the Live signal requires provenance AND freshness', () => {
  it('an editorial value is NEVER live', () => {
    expect(signalOf(editorial('OWNER'))).toBe('editorial')
  })

  it('a fresh backend reading is live', () => {
    expect(signalOf(available('42', { provenance: 'live', asOf: null }))).toBe('live')
    expect(signalOf(available('42', { provenance: 'chain', asOf: null }))).toBe('live')
    expect(signalOf(available('42', { provenance: 'indexed', asOf: null }))).toBe('live')
  })

  it('a stale reading is flagged stale, not live', () => {
    expect(signalOf(available('42', { provenance: 'live', stale: true }))).toBe('stale')
  })

  it('an unknown-provenance value is not live', () => {
    expect(signalOf(available('42', { provenance: 'unknown' }))).toBe('editorial')
  })

  it('an absence is absent', () => {
    expect(signalOf(unavailable({}))).toBe('absent')
  })
})
