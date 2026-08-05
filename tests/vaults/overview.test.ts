import {
  asMoney,
  denomination,
  estateOverview,
  movementTypeBars,
  recentActivityTrend,
  sumAcrossVaults,
} from '@/lib/vaults/overview'
import {
  available,
  isAvailable,
  unavailable,
  valueOf,
  vaultId,
  type AdminRegistry,
  type Availability,
  type Movement,
  type Vault,
} from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * The shared overview arithmetic.
 *
 * These figures are now read by TWO surfaces — the administration overview and
 * the green command center laboratory. The point of the tests is that neither
 * surface can be handed a number the service did not support: an unreadable
 * operand propagates as an absence, and it never degrades into a zero that
 * would look exactly like a real measurement.
 */

const ADDRESS = '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa'

function readableVault(overrides: Partial<Vault> = {}): Vault {
  const id = vaultId(31337, ADDRESS)!
  return {
    id,
    label: 'Series 1',
    chainId: 31337,
    contractAddress: ADDRESS,
    status: 'ACTIVE',
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
    ...overrides,
  }
}

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'evt-1' as Movement['id'],
    vaultId: vaultId(31337, ADDRESS),
    eventName: 'Deposit',
    blockNumber: '1',
    txHash: '0xabc',
    chainId: 31337,
    investorAddress: null,
    assetAmountAtomic: '1000000',
    shareAmountAtomic: null,
    occurredAt: '2026-07-27T10:00:00.000Z',
    indexedAt: null,
    strategyId: unavailable({}),
    ...overrides,
  }
}

function registry(overrides: Partial<AdminRegistry> = {}): AdminRegistry {
  return {
    vaults: available([readableVault()]),
    clients: unavailable({ endpoint: '/api/v1/clients', status: 'NOT_EXPOSED' }),
    clientExceptions: unavailable({}),
    deployments: unavailable({ endpoint: '/api/v1/deployments', status: 'NOT_EXPOSED' }),
    compliance: unavailable({ endpoint: '/api/v1/compliance', status: 'NOT_EXPOSED' }),
    movements: available([movement()]),
    rebalancing: unavailable({ endpoint: '/api/v1/vault/strategies' }),
    sources: [
      { endpointId: 'vault', label: 'Vault', status: 'LIVE', detail: null, asOf: null },
      { endpointId: 'events', label: 'Ledger', status: 'UNAVAILABLE', detail: null, asOf: null },
    ],
    ...overrides,
  }
}

describe('denomination', () => {
  it('reports the shared denomination when every vault agrees', () => {
    const denom = denomination(available([readableVault(), readableVault()]))
    expect(valueOf(denom)).toEqual({ symbol: 'USDC', decimals: 6 })
  })

  it('refuses to state one when two vaults disagree', () => {
    const other = readableVault({ asset: available({ symbol: 'DAI', decimals: 18 }) })
    const denom = denomination(available([readableVault(), other]))
    expect(isAvailable(denom)).toBe(false)
    expect(denom).toMatchObject({ reason: 'vaults_use_different_denominations' })
  })

  it('treats an empty register as an absence, not as a denomination', () => {
    const denom = denomination(available([]))
    expect(isAvailable(denom)).toBe(false)
    expect(denom).toMatchObject({ status: 'EMPTY', endpoint: '/api/v1/vault' })
  })
})

describe('sumAcrossVaults', () => {
  it('sums a reading present on every vault', () => {
    const total = sumAcrossVaults(available([readableVault(), readableVault()]), (v) =>
      available(BigInt(v.totalAssetsAtomic.kind === 'available' ? v.totalAssetsAtomic.value : '0')),
    )
    expect(valueOf(total)).toBe(BigInt('2000000000'))
  })

  it('makes the whole total unavailable when a single vault cannot be read', () => {
    const broken = readableVault({ totalAssetsAtomic: unavailable({ reason: 'rpc_error' }) })
    const total = sumAcrossVaults(available([readableVault(), broken]), (v) =>
      v.totalAssetsAtomic.kind === 'available' ? available(BigInt(v.totalAssetsAtomic.value)) : v.totalAssetsAtomic,
    )
    expect(isAvailable(total)).toBe(false)
    expect(total).toMatchObject({ reason: 'rpc_error' })
  })

  it('does not turn a sum over nothing into zero', () => {
    const total = sumAcrossVaults(available([]), () => available(BigInt(1)))
    expect(isAvailable(total)).toBe(false)
    expect(total).toMatchObject({ status: 'EMPTY' })
  })
})

describe('asMoney', () => {
  it('needs both the total and its denomination', () => {
    expect(valueOf(asMoney(available(BigInt('1500000000')), available({ symbol: 'USDC', decimals: 6 })))).toBe('$1,500')
    expect(isAvailable(asMoney(available(BigInt(1)), unavailable({})))).toBe(false)
    expect(isAvailable(asMoney(unavailable({}), available({ symbol: 'USDC', decimals: 6 })))).toBe(false)
  })
})

describe('movementTypeBars', () => {
  it('counts movements per type, densest first', () => {
    const bars = movementTypeBars(
      available([{ eventName: 'Deposit' }, { eventName: 'Deposit' }, { eventName: 'ElectricityPaid' }]),
    )
    expect(bars.length).toBe(2)
    expect(bars[0]?.value).toBe(2)
    expect(bars[1]?.value).toBe(1)
  })

  it('yields no bars at all when the ledger is unreadable', () => {
    expect(movementTypeBars(unavailable({}))).toEqual([])
  })
})

describe('recentActivityTrend', () => {
  it('plots money moved when amounts and a denomination are both known', () => {
    const trend = recentActivityTrend(
      available([
        movement({ id: 'a' as Movement['id'], assetAmountAtomic: '1000000', occurredAt: '2026-07-27T10:00:00.000Z' }),
        movement({ id: 'b' as Movement['id'], assetAmountAtomic: '3000000', occurredAt: '2026-07-28T10:00:00.000Z' }),
      ]),
      available({ symbol: 'USDC', decimals: 6 }),
    )
    const points = valueOf(trend)
    expect(points?.length).toBe(2)
    expect(points?.[0]?.value).toBe(1)
    expect(points?.[1]?.value).toBe(3)
  })

  it('falls back to a count per day when the denomination is unknown', () => {
    const trend = recentActivityTrend(
      available([
        movement({ id: 'a' as Movement['id'], occurredAt: '2026-07-27T10:00:00.000Z' }),
        movement({ id: 'b' as Movement['id'], occurredAt: '2026-07-28T10:00:00.000Z' }),
      ]),
      unavailable({ reason: 'rpc_error' }),
    )
    const points = valueOf(trend)
    expect(points?.length).toBe(2)
    expect(points?.every((p) => p.value === 1)).toBe(true)
  })

  it('reports a named absence rather than drawing a single-point line', () => {
    const trend = recentActivityTrend(available([movement()]), unavailable({}))
    expect(isAvailable(trend)).toBe(false)
    expect(trend).toMatchObject({ status: 'PARTIAL', reason: 'not_enough_ordered_points' })
  })

  it('stays unavailable when the ledger itself is', () => {
    const trend = recentActivityTrend(unavailable({ endpoint: '/api/v1/series1/events' }), available({ symbol: 'USDC', decimals: 6 }))
    expect(isAvailable(trend)).toBe(false)
  })
})

describe('estateOverview', () => {
  it('derives every figure from one registry read', () => {
    const overview = estateOverview(registry())
    expect(valueOf(overview.activeVaults)).toBe('1')
    expect(valueOf(overview.totalValueLocked)).toBe('$1,000')
    expect(valueOf(overview.deployedCapital)).toBe('$750')
    expect(valueOf(overview.availableCapital)).toBe('$250')
    expect(valueOf(overview.deploymentRatioBps)).toBe(7500)
    expect(valueOf(overview.deploymentRatio)).toBe('75%')
    expect(valueOf(overview.liveSources)).toBe('1/2')
  })

  it('propagates an unreadable vault register through every money figure', () => {
    const overview = estateOverview(registry({ vaults: unavailable({ endpoint: '/api/v1/vault', reason: 'rpc_error' }) }))
    const figures: readonly Availability<unknown>[] = [
      overview.totalValueLocked,
      overview.deployedCapital,
      overview.availableCapital,
      overview.deploymentRatioBps,
      overview.activeVaults,
    ]
    for (const figure of figures) {
      expect(isAvailable(figure)).toBe(false)
    }
  })

  it('counts a readable but empty movement window without inventing a curve', () => {
    const overview = estateOverview(registry({ movements: available([]) }))
    expect(valueOf(overview.recentMovements)).toBe('0')
    expect(overview.movementBars).toEqual([])
    expect(isAvailable(overview.recentTrend)).toBe(false)
  })

  it('treats 0/0 deployed+idle as absent, not 0% (F-08)', () => {
    const overview = estateOverview(
      registry({
        vaults: available([
          readableVault({
            totalAssetsAtomic: available('0'),
            deployedBps: available(5000),
          }),
        ]),
      }),
    )
    expect(isAvailable(overview.deploymentRatioBps)).toBe(false)
    expect(isAvailable(overview.deploymentRatio)).toBe(false)
    expect(overview.deploymentRatioBps).toMatchObject({ status: 'EMPTY', reason: 'no_deployed_capital' })
  })
})
