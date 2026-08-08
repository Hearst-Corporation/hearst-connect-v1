import {
  buildFunnel,
  buildPriorityQueue,
  complianceDistribution,
  deploymentDistribution,
  kycStatusBuckets,
  movementDailyHeatmap,
  subscriptionsByProduct,
} from '@/lib/vaults/pilotage'
import {
  available,
  isAvailable,
  unavailable,
  valueOf,
  vaultId,
  type AdminRegistry,
  type ClientException,
  type ComplianceReview,
  type Deployment,
  type Vault,
} from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * The subscription funnel and priority queue — pure arithmetic over an
 * `AdminRegistry`, mirroring the discipline of `tests/vaults/overview.test.ts`.
 *
 * The central guarantee under test: an absent source stays absent through
 * every derivation, and every count on screen is either real or explicitly
 * unmeasurable — never a zero standing in for "we don't know".
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

function compliance(overrides: Partial<ComplianceReview> = {}): ComplianceReview {
  return {
    id: 'rev-1' as ComplianceReview['id'],
    clientId: 'cli-1' as ComplianceReview['clientId'],
    clientLabel: 'Jean Dupont',
    stage: 'a-verifier',
    kycStatus: 'pending',
    openedAt: '2026-08-01T00:00:00.000Z',
    lastEventAt: null,
    ...overrides,
  }
}

function deployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: 'dep-1' as Deployment['id'],
    vaultId: vaultId(31337, ADDRESS)!,
    clientLabel: available('ACME Ltd'),
    amountAtomic: '25000000000',
    strategyId: null,
    requestedAt: '2026-08-01T00:00:00.000Z',
    confirmedAt: null,
    status: 'REQUESTED',
    reference: 'REF-1',
    ...overrides,
  }
}

function exception(overrides: Partial<ClientException> = {}): ClientException {
  return {
    clientId: null,
    clientLabel: 'ACME Ltd',
    issue: 'NO_VAULT_ASSIGNED',
    relatedVaultId: null,
    compliance: unavailable({}),
    lastActivityAt: unavailable({}),
    actionHref: '/admin/vaults',
    actionLabel: 'Assign a vault',
    ...overrides,
  }
}

function registry(overrides: Partial<AdminRegistry> = {}): AdminRegistry {
  return {
    vaults: available([readableVault()]),
    clients: available([{ id: 'cli-1' as never, label: 'Jean Dupont' }]),
    clientExceptions: available([]),
    deployments: available([deployment()]),
    compliance: available([compliance()]),
    movements: available([]),
    rebalancing: unavailable({}),
    sources: [],
    ...overrides,
  }
}

describe('buildFunnel', () => {
  it('produces all six steps in order, each with a real count', () => {
    const funnel = buildFunnel(registry())
    expect(funnel.map((s) => s.id)).toEqual(['compte', 'kyc', 'wallet', 'depot', 'souscription', 'position'])
    expect(valueOf(funnel[0].count)).toBe('1') // clients
    expect(valueOf(funnel[1].count)).toBe('1') // compliance
    expect(valueOf(funnel[2].count)).toBe('1') // vaults
    expect(valueOf(funnel[4].count)).toBe('1') // deployments
  })

  it('reports a step as unavailable, never as a zero, when its source did not answer', () => {
    const funnel = buildFunnel(registry({ clients: unavailable({ endpoint: '/api/v1/clients', status: 'UNAVAILABLE' }) }))
    const compte = funnel.find((s) => s.id === 'compte')!
    expect(isAvailable(compte.count)).toBe(false)
    expect(valueOf(compte.count)).toBeNull()
  })

  it('counts KYC still open by stage, not by a guessed kycStatus vocabulary', () => {
    const funnel = buildFunnel(
      registry({
        compliance: available([
          compliance({ id: 'r1' as never, stage: 'a-verifier' }),
          compliance({ id: 'r2' as never, stage: 'termine' }),
        ]),
      }),
    )
    const kyc = funnel.find((s) => s.id === 'kyc')!
    expect(valueOf(kyc.count)).toBe('2')
    expect(valueOf(kyc.pending)).toBe('1')
  })

  it('counts positions only from CONFIRMED deployments', () => {
    const funnel = buildFunnel(
      registry({
        deployments: available([
          deployment({ id: 'd1' as never, status: 'CONFIRMED' }),
          deployment({ id: 'd2' as never, status: 'FAILED' }),
          deployment({ id: 'd3' as never, status: 'REQUESTED' }),
        ]),
      }),
    )
    const position = funnel.find((s) => s.id === 'position')!
    const souscription = funnel.find((s) => s.id === 'souscription')!
    expect(valueOf(position.count)).toBe('1')
    expect(valueOf(souscription.pending)).toBe('1') // only the REQUESTED one
  })

  it('names the wallet and deposit steps as proxies, honestly, in their source note', () => {
    const funnel = buildFunnel(registry())
    const wallet = funnel.find((s) => s.id === 'wallet')!
    const depot = funnel.find((s) => s.id === 'depot')!
    expect(wallet.sourceNote).toMatch(/proxy/)
    expect(depot.sourceNote).toMatch(/proxy/)
  })

  it('reports deposit "pending" as genuinely not exposed — there is no reconciliation endpoint', () => {
    const funnel = buildFunnel(registry())
    const depot = funnel.find((s) => s.id === 'depot')!
    expect(isAvailable(depot.pending)).toBe(false)
  })
})

describe('buildPriorityQueue', () => {
  it('is empty (not unavailable) when both sources are live and nothing is open', () => {
    const queue = buildPriorityQueue(
      registry({
        compliance: available([compliance({ stage: 'termine' })]),
        deployments: available([deployment({ status: 'CONFIRMED' })]),
      }),
    )
    expect(isAvailable(queue)).toBe(true)
    expect(valueOf(queue)).toEqual([])
  })

  it('ranks a failed deployment as critical, ahead of a fresh KYC review', () => {
    const queue = buildPriorityQueue(
      registry({
        compliance: available([compliance({ id: 'r1' as never, openedAt: new Date().toISOString() })]),
        deployments: available([deployment({ id: 'd1' as never, status: 'FAILED' })]),
      }),
    )
    const rows = valueOf(queue)!
    expect(rows[0].severity).toBe('critique')
    expect(rows[0].kind).toBe('transaction')
  })

  it('propagates absence when neither compliance nor deployments answer', () => {
    const queue = buildPriorityQueue(
      registry({
        compliance: unavailable({ endpoint: '/api/v1/compliance', status: 'UNAVAILABLE' }),
        deployments: unavailable({ endpoint: '/api/v1/deployments', status: 'UNAVAILABLE' }),
      }),
    )
    expect(isAvailable(queue)).toBe(false)
  })

  it('still builds the queue from whichever single source answers', () => {
    const queue = buildPriorityQueue(
      registry({
        compliance: available([compliance()]),
        deployments: unavailable({ endpoint: '/api/v1/deployments', status: 'UNAVAILABLE' }),
      }),
    )
    expect(isAvailable(queue)).toBe(true)
    expect(valueOf(queue)!.length).toBe(1)
  })

  it('names a resolution action on every row — no row without a route', () => {
    const queue = buildPriorityQueue(registry())
    for (const row of valueOf(queue) ?? []) {
      expect(row.actionHref).toMatch(/^\/admin\//)
      expect(row.actionLabel.length).toBeGreaterThan(0)
    }
  })
})

describe('distributions', () => {
  it('returns an empty distribution, not a fabricated one, when the source is unavailable', () => {
    expect(complianceDistribution(unavailable({}))).toEqual([])
    expect(deploymentDistribution(unavailable({}))).toEqual([])
  })

  it('tallies real rows by their real status field', () => {
    const dist = deploymentDistribution(
      available([
        deployment({ id: 'd1' as never, status: 'CONFIRMED' }),
        deployment({ id: 'd2' as never, status: 'CONFIRMED' }),
        deployment({ id: 'd3' as never, status: 'FAILED' }),
      ]),
    )
    expect(dist).toEqual(
      expect.arrayContaining([
        { label: 'CONFIRMED', value: 2 },
        { label: 'FAILED', value: 1 },
      ]),
    )
  })
})

describe('kycStatusBuckets / subscriptionsByProduct / movementDailyHeatmap', () => {
  it('propagates compliance absence without inventing buckets', () => {
    const buckets = kycStatusBuckets(unavailable({ endpoint: '/api/v1/compliance', status: 'UNAVAILABLE' }))
    expect(isAvailable(buckets)).toBe(false)
  })

  it('maps recognised KYC statuses into named buckets only', () => {
    const buckets = kycStatusBuckets(
      available([
        compliance({ id: 'a' as never, kycStatus: 'approved' }),
        compliance({ id: 'b' as never, kycStatus: 'pending review' }),
        compliance({ id: 'c' as never, kycStatus: 'blocked' }),
        compliance({ id: 'd' as never, kycStatus: 'xyz-unknown-token' }),
      ]),
    )
    expect(isAvailable(buckets)).toBe(true)
    if (!isAvailable(buckets)) return
    expect(buckets.value).toEqual(
      expect.arrayContaining([
        { id: 'valide', label: 'Validated', value: 1 },
        { id: 'en_revue', label: 'In review', value: 1 },
        { id: 'bloque', label: 'Blocked', value: 1 },
      ]),
    )
    expect(buckets.value.find((b) => b.id === 'a_completer')).toBeUndefined()
  })

  it('groups deployments by strategy without inventing amounts', () => {
    const volumes = subscriptionsByProduct(
      available([
        deployment({ id: 'd1' as never, strategyId: 's0' as never, amountAtomic: '10' }),
        deployment({ id: 'd2' as never, strategyId: 's0' as never, amountAtomic: '20' }),
        deployment({ id: 'd3' as never, strategyId: 's1' as never, amountAtomic: null }),
      ]),
    )
    expect(isAvailable(volumes)).toBe(true)
    if (!isAvailable(volumes)) return
    const s0 = volumes.value.find((v) => v.product === 's0')
    const s1 = volumes.value.find((v) => v.product === 's1')
    expect(s0).toEqual({ product: 's0', count: 2, amountAtomic: '30' })
    expect(s1).toEqual({ product: 's1', count: 1, amountAtomic: null })
  })

  it('builds heatmap cells only for days with real timestamps', () => {
    const heat = movementDailyHeatmap(
      available([
        {
          id: 'm1' as never,
          vaultId: vaultId(31337, ADDRESS)!,
          eventName: 'Deposit',
          blockNumber: null,
          txHash: null,
          chainId: 31337,
          investorAddress: null,
          assetAmountAtomic: '1',
          shareAmountAtomic: null,
          occurredAt: '2026-08-01T12:00:00.000Z',
          indexedAt: null,
          strategyId: unavailable({}),
        },
        {
          id: 'm2' as never,
          vaultId: vaultId(31337, ADDRESS)!,
          eventName: 'Deposit',
          blockNumber: null,
          txHash: null,
          chainId: 31337,
          investorAddress: null,
          assetAmountAtomic: '1',
          shareAmountAtomic: null,
          occurredAt: '2026-08-01T18:00:00.000Z',
          indexedAt: null,
          strategyId: unavailable({}),
        },
      ]),
      7,
    )
    expect(isAvailable(heat)).toBe(true)
    if (!isAvailable(heat)) return
    expect(heat.value).toHaveLength(1)
    expect(heat.value[0]?.count).toBe(2)
    expect(heat.value[0]?.day).toBe('2026-08-01')
  })
})
