import {
  available,
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  mapAvailability,
  parseVaultId,
  strategyId,
  unavailable,
  valueOf,
  vaultId,
  type Availability,
  type Vault,
} from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * The admin operating model's truthfulness invariants.
 *
 * The rejection criterion this file exists for is "are unavailable values
 * clearly distinguished from zero?". In this model that is not a rendering
 * convention anyone has to remember at each call site — it is a property of
 * the type, and these tests are what keep it one.
 */

/** A vault with every reading present, as the service actually returns one. */
function vaultLisible(overrides: Partial<Vault> = {}): Vault {
  const id = vaultId(31337, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
  return {
    id,
    label: 'Series 1',
    chainId: 31337,
    contractAddress: '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa',
    status: 'ACTIVE',
    asset: available({ symbol: 'USDC', decimals: 6 }),
    totalAssetsAtomic: available('1177864107010'),
    tvlCapAtomic: available('2000000000000'),
    capacityRemainingAtomic: available('822135892990'),
    utilizationBps: available(5889),
    navPerShare: available('1.166086'),
    strategies: available([]),
    deployedBps: available(9673),
    worstDriftBps: available(-215),
    rebalancing: unavailable({ reason: 'not_exposed_by_contract' }),
    client: unavailable({ endpoint: '/api/v1/clients', status: 'NOT_EXPOSED' }),
    lastActivityAt: available('2026-07-28T05:52:29.053Z'),
    ...overrides,
  }
}

describe('availability is not nullability', () => {
  it('never yields a value for an absence', () => {
    const absent = unavailable({ reason: 'no_client_directory_endpoint' })
    expect(isAvailable(absent)).toBe(false)
    expect(valueOf(absent)).toBeNull()
  })

  it('carries the reason and the route that would answer it', () => {
    const absent = unavailable({ reason: 'no_deployment_ledger_endpoint', endpoint: '/api/v1/deployments' })
    expect(absent.kind).toBe('unavailable')
    if (absent.kind === 'unavailable') {
      expect(absent.reason).toBe('no_deployment_ledger_endpoint')
      expect(absent.endpoint).toBe('/api/v1/deployments')
    }
  })

  it('refuses to derive a value from an operand it never read', () => {
    const known: Availability<number> = available(10)
    const missing: Availability<number> = unavailable({ reason: 'not_exposed_by_contract' })

    expect(valueOf(combine(known, missing, (a, b) => a + b))).toBeNull()
    expect(valueOf(combine(missing, known, (a, b) => a + b))).toBeNull()
    expect(valueOf(combine(known, known, (a, b) => a + b))).toBe(20)
  })

  it('propagates an absence through a mapping instead of substituting one', () => {
    const missing: Availability<number> = unavailable({ reason: 'no_readable_pocket_drift' })
    const mapped = mapAvailability(missing, (n) => n * 2)
    expect(isAvailable(mapped)).toBe(false)
  })
})

describe('identifiers are stable and scoped', () => {
  it('identifies a vault by chain and contract, not by label', () => {
    const a = vaultId(31337, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
    const b = vaultId(1, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
    expect(a).not.toBe(b)
    // Case is normalised, so the same vault never gets two identities.
    expect(vaultId(31337, '0X66DF4FFD1312604CD0C8567D79EBEE259D1FFABA')).toBe(a)
  })

  it('refuses to mint an identifier without a contract', () => {
    expect(vaultId(31337, null)).toBeNull()
    expect(vaultId(31337, '')).toBeNull()
  })

  it('round-trips through the route segment', () => {
    const id = vaultId(31337, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
    const parsed = parseVaultId(id)
    expect(parsed?.chainId).toBe(31337)
    expect(parsed?.contractAddress).toBe('0x66df4ffd1312604cd0c8567d79ebee259d1ffaba')
    expect(parseVaultId('not-a-vault')).toBeNull()
  })

  it('scopes a pocket to its vault', () => {
    const one = vaultId(31337, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
    const two = vaultId(1, '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa')!
    // "S0" on two different vaults is two different strategies.
    expect(strategyId(one, 'S0')).not.toBe(strategyId(two, 'S0'))
  })
})

describe('derived capital', () => {
  it('splits the vault into deployed and idle from readings that agree', () => {
    const vault = vaultLisible()
    const deployed = deployedAtomic(vault)
    const idle = idleAtomic(vault)

    expect(isAvailable(deployed)).toBe(true)
    expect(isAvailable(idle)).toBe(true)
    if (!isAvailable(deployed) || !isAvailable(idle)) return

    // 9673 bps of 1177864107010, and the remainder.
    expect(deployed.value).toBe((BigInt('1177864107010') * BigInt(9673)) / BigInt(10000))
    expect(deployed.value + idle.value).toBe(BigInt('1177864107010'))
  })

  it('reports nothing rather than zero when the placed share is unreadable', () => {
    const vault = vaultLisible({
      deployedBps: unavailable({ reason: 'some_pocket_shares_unreadable' }),
    })
    expect(valueOf(deployedAtomic(vault))).toBeNull()
    expect(valueOf(idleAtomic(vault))).toBeNull()
  })

  it('reports nothing rather than zero when the vault total is unreadable', () => {
    const vault = vaultLisible({ totalAssetsAtomic: unavailable({ reason: 'totalAssets_not_reported' }) })
    expect(valueOf(deployedAtomic(vault))).toBeNull()
  })
})
