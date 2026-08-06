import {
  DRIFT_THRESHOLD_BPS,
  buildCockpitDecisionQueue,
  misallocatedCapitalAtomic,
  netFlowFromMovements,
  pocketDrifts,
  worstEstateDriftBps,
} from '@/lib/vaults/cockpit'
import {
  available,
  isAvailable,
  unavailable,
  valueOf,
  vaultId,
  type AdminRegistry,
  type Movement,
  type Strategy,
  type Vault,
} from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

const ADDRESS = '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa'

function strategy(overrides: Partial<Strategy> = {}): Strategy {
  const id = vaultId(31337, ADDRESS)!
  return {
    id: `${id}:S0` as Strategy['id'],
    vaultId: id,
    pocket: 'S0',
    label: 'Meridian S1',
    targetBps: 3000,
    actualBps: 3512,
    driftBps: 512,
    enabled: true,
    isIdle: false,
    adapter: null,
    assetsAtomic: available('2910000000000'),
    ...overrides,
  }
}

function readableVault(overrides: Partial<Vault> = {}): Vault {
  const id = vaultId(31337, ADDRESS)!
  return {
    id,
    label: 'Series 1',
    chainId: 31337,
    contractAddress: ADDRESS,
    status: 'ACTIVE',
    asset: available({ symbol: 'USDC', decimals: 6 }),
    totalAssetsAtomic: available('8410000000000'),
    tvlCapAtomic: available('20000000000000'),
    capacityRemainingAtomic: available('10000000000000'),
    utilizationBps: available(5000),
    navPerShare: available('1.0'),
    strategies: available([strategy()]),
    deployedBps: available(7500),
    worstDriftBps: available(512),
    rebalancing: unavailable({ reason: 'not_exposed_by_contract' }),
    client: unavailable({ endpoint: '/api/v1/clients', status: 'NOT_EXPOSED', reason: 'owner_unmapped' }),
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
    assetAmountAtomic: '612000000000',
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
    clientExceptions: available([]),
    deployments: unavailable({ endpoint: '/api/v1/deployments', status: 'NOT_EXPOSED' }),
    compliance: unavailable({ endpoint: '/api/v1/compliance', status: 'NOT_EXPOSED' }),
    movements: available([
      movement(),
      movement({
        id: 'evt-2' as Movement['id'],
        eventName: 'Redeem',
        assetAmountAtomic: '192000000000',
      }),
    ]),
    rebalancing: unavailable({ endpoint: '/api/v1/vault/strategies' }),
    sources: [{ endpointId: 'vault', label: 'Vault', status: 'LIVE', detail: null, asOf: null }],
    ...overrides,
  }
}

describe('pocketDrifts / worstEstateDriftBps', () => {
  it('lit la dérive réelle et marque le seuil console', () => {
    const rows = pocketDrifts(registry())
    expect(isAvailable(rows)).toBe(true)
    if (!isAvailable(rows)) return
    expect(rows.value[0]?.driftBps).toBe(512)
    expect(rows.value[0]?.beyondThreshold).toBe(true)
    expect(DRIFT_THRESHOLD_BPS).toBe(200)
    expect(valueOf(worstEstateDriftBps(registry()))).toBe(512)
  })

  it('propage l’absence de coffres', () => {
    const rows = pocketDrifts(
      registry({ vaults: unavailable({ endpoint: '/api/v1/vault', status: 'UNAVAILABLE' }) }),
    )
    expect(isAvailable(rows)).toBe(false)
  })
})

describe('misallocatedCapitalAtomic', () => {
  it('dérive |drift| × assets / 10000', () => {
    // 512 * 2910000000000 / 10000 = 148992000000
    expect(valueOf(misallocatedCapitalAtomic(registry()))).toBe(BigInt('148992000000'))
  })

  it('refuse si les actifs de poche sont illisibles', () => {
    const reg = registry({
      vaults: available([
        readableVault({
          strategies: available([
            strategy({ assetsAtomic: unavailable({ reason: 'pocket_assets_disagree' }), actualBps: null }),
          ]),
        }),
      ]),
    })
    expect(isAvailable(misallocatedCapitalAtomic(reg))).toBe(false)
  })
})

describe('netFlowFromMovements', () => {
  it('calcule dépôts − rachats sur la fenêtre', () => {
    const flow = netFlowFromMovements(registry().movements)
    expect(valueOf(flow)).toEqual({
      depositAtomic: BigInt('612000000000'),
      redeemAtomic: BigInt('192000000000'),
      netAtomic: BigInt('420000000000'),
      amountsIncomplete: false,
    })
  })

  it('signale les montants manquants sans inventer', () => {
    const flow = netFlowFromMovements(
      available([movement({ assetAmountAtomic: null }), movement({ id: 'evt-3' as Movement['id'] })]),
    )
    expect(isAvailable(flow)).toBe(true)
    if (!isAvailable(flow)) return
    expect(flow.value.amountsIncomplete).toBe(true)
    expect(flow.value.depositAtomic).toBe(BigInt('612000000000'))
  })
})

describe('buildCockpitDecisionQueue', () => {
  it('priorise les dérives hors seuil et classe par capital', () => {
    const queue = buildCockpitDecisionQueue(registry())
    expect(isAvailable(queue)).toBe(true)
    if (!isAvailable(queue)) return
    expect(queue.value.some((d) => d.id.startsWith('drift-'))).toBe(true)
    expect(queue.value.some((d) => d.id.startsWith('owner-'))).toBe(true)
    const firstDrift = queue.value.find((d) => d.id.startsWith('drift-'))
    expect(firstDrift?.severity).toBe('critique')
  })
})
