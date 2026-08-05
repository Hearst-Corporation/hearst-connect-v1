import { loadAdminRegistry } from '@/lib/vaults/registry'
import { createToken, type Session } from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Protection tests for the vault registry loader.
 *
 * The registry is the single place where six backend endpoints are joined
 * into one operating model. These tests guard the invariants that matter
 * during the upcoming complexity refactor: unavailable values stay distinct
 * from zero, identifiers are stable, and relationships (client, strategy,
 * movement, deployment) are preserved rather than fabricated.
 */

const BACKEND_TOKEN = 'cGF5bG9hZA.c2lnbmF0dXJl'

let currentCookie: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (_name: string, value: string) => {
      currentCookie = value
    },
    get: () => (currentCookie === undefined ? undefined : { name: 'hearst_session', value: currentCookie }),
    delete: () => {
      currentCookie = undefined
    },
  }),
}))

function seedSession(overrides: Partial<Session> = {}) {
  currentCookie = createToken({
    userId: 'usr_1',
    email: 'adrien@hearstcorporation.io',
    name: 'adrien',
    role: 'OWNER',
    backendToken: BACKEND_TOKEN,
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  })
}

function meta() {
  return {
    status: 'LIVE',
    source: 'chain',
    generatedAt: '2026-07-28T08:00:00.000Z',
    freshnessSeconds: 0,
    version: 'v1',
    reason: null,
  }
}

function envelope<T>(data: T) {
  return { data, meta: meta() }
}

function trace(httpStatus: number | null = 200) {
  return {
    endpointId: 'test',
    path: '/test',
    startedAt: Date.now(),
    durationMs: 1,
    httpStatus,
    requestId: 'req-test',
    rateLimitRemaining: null,
  }
}

function adminEndpointsResponse(mode: 'live-empty' | 'not-exposed' = 'live-empty') {
  if (mode === 'not-exposed') {
    const fail = {
      ok: false as const,
      problem: null,
      keeper: null,
      trace: trace(404),
      state: {
        status: 'UNAVAILABLE' as const,
        value: null,
        provenance: 'unknown' as const,
        freshness: { asOf: null, ageSeconds: null, stale: false },
      },
    }
    return { clients: fail, deployments: fail, compliance: fail }
  }
  const fresh = { asOf: '2026-07-28T08:00:00.000Z', ageSeconds: 0, stale: false }
  const bloc = { status: 'LIVE', value: [], provenance: 'db', freshness: fresh }
  const ok = (data: object) => ({ ok: true as const, data, meta: meta(), trace: trace() })
  return {
    clients: ok({ clients: bloc }),
    deployments: ok({ deployments: bloc }),
    compliance: ok({ reviews: bloc }),
  }
}

function adminEndpoint(endpointId: string, mode: 'live-empty' | 'not-exposed' = 'live-empty') {
  const pack = adminEndpointsResponse(mode)
  if (endpointId === 'clients') return pack.clients
  if (endpointId === 'deployments') return pack.deployments
  if (endpointId === 'compliance') return pack.compliance
  return null
}

const ADDRESS = '0x66dF4fFD1312604cd0c8567d79eBEe259D1FFaBa'
const VAULT_ID = `31337-${ADDRESS.toLowerCase()}`

function runtime() {
  return { chainId: 31337, contractAddress: ADDRESS, codePresent: true, codePresence: 'present' }
}

function vaultResponse(overrides: { snapshot?: Record<string, unknown>; capacity?: Record<string, unknown> } = {}) {
  return envelope({
    runtime: runtime(),
    snapshot: {
      status: 'LIVE',
      value: {
        asset: 'USDC',
        assetDecimals: 6,
        totalAssets: '1177864107010',
        totalShares: '1000000000000',
        navPerShare: '1.166086',
      },
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
      ...overrides.snapshot,
    },
    capacity: {
      status: 'LIVE',
      value: {
        tvlCap: '2000000000000',
        totalAssets: '1177864107010',
        availableCapacity: '822135892990',
        utilizationBps: 5889,
      },
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
      ...overrides.capacity,
    },
  })
}

function strategiesResponse(overrides: { strategies?: Record<string, unknown> } = {}) {
  return envelope({
    runtime: runtime(),
    strategies: {
      status: 'LIVE',
      value: [
        {
          pocket: 'S0',
          label: 'Strategy 0',
          targetBps: 5000,
          actualBps: 4900,
          driftBps: -100,
          isIdle: false,
          enabled: true,
          adapter: '0x2222222222222222222222222222222222222222',
        },
        {
          pocket: 'S1',
          label: 'Strategy 1',
          targetBps: 5000,
          actualBps: 5100,
          driftBps: 100,
          isIdle: false,
          enabled: true,
          adapter: '0x3333333333333333333333333333333333333333',
        },
      ],
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
      ...overrides.strategies,
    },
  })
}

function rwaResponse(overrides: { pockets?: Record<string, unknown> } = {}) {
  return envelope({
    runtime: runtime(),
    pockets: {
      status: 'LIVE',
      value: [
        { pocket: 'S0', pocketAssets: '577158009330' },
        { pocket: 'S1', pocketAssets: '600705597707' },
      ],
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
      ...overrides.pockets,
    },
  })
}

function rebalancingResponse() {
  return envelope({
    runtime: runtime(),
    rebalancing: {
      status: 'UNAVAILABLE',
      reason: 'not_exposed_by_contract',
      value: null,
      provenance: null,
      freshness: null,
    },
  })
}

function eventsResponse(overrides: { events?: Record<string, unknown> } = {}) {
  return envelope({
    events: {
      status: 'LIVE',
      value: [
        {
          id: 'evt-1',
          eventName: 'Deposit',
          chainId: 31337,
          contractAddress: ADDRESS,
          blockNumber: '42',
          txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          investorAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          assetAmountAtomic: '1000000000',
          shareAmountAtomic: '857000000',
          occurredAt: '2026-07-28T07:30:00.000Z',
          indexedAt: '2026-07-28T07:31:00.000Z',
        },
      ],
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
      ...overrides.events,
    },
  })
}

function dashboardResponse(overrides: { identity?: Record<string, unknown> } = {}) {
  return envelope({
    identity: {
      status: 'UNAVAILABLE',
      reason: 'no_investor_record',
      value: null,
      ...overrides.identity,
    },
    allocation: {
      status: 'LIVE',
      value: { pockets: [] },
      provenance: 'chain',
      freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
    },
  })
}

beforeEach(() => {
  vi.resetModules()
  process.env.AUTH_SECRET = 'un-secret-de-session-de-32-caracteres-au-moins'
  currentCookie = undefined
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.AUTH_SECRET
})

describe('loadAdminRegistry', () => {
  it('builds a vault from complete sources and preserves identifiers', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          switch (endpointId) {
            case 'vault':
              return { ok: true, data: vaultResponse().data, meta: meta(), trace: {} as never }
            case 'vault-strategies':
              return { ok: true, data: strategiesResponse().data, meta: meta(), trace: {} as never }
            case 'rwa-vault':
              return { ok: true, data: rwaResponse().data, meta: meta(), trace: {} as never }
            case 'rebalancing-status':
              return { ok: true, data: rebalancingResponse().data, meta: meta(), trace: {} as never }
            case 'series1-events':
              return { ok: true, data: eventsResponse().data, meta: meta(), trace: {} as never }
            case 'dashboard':
              return { ok: true, data: dashboardResponse().data, meta: meta(), trace: {} as never }
            default: {
              const admin = adminEndpoint(endpointId)
              if (admin) return admin
              throw new Error(`Unexpected endpoint: ${endpointId}`)
            }
          }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.vaults.kind).toBe('available')
    if (registry.vaults.kind !== 'available') return

    const [vault] = registry.vaults.value
    expect(vault.id).toBe(VAULT_ID)
    expect(vault.chainId).toBe(31337)
    expect(vault.contractAddress).toBe(ADDRESS)
    expect(vault.status).toBe('ACTIVE')

    expect(vault.strategies.kind).toBe('available')
    if (vault.strategies.kind !== 'available') return
    expect(vault.strategies.value).toHaveLength(2)
    expect(vault.strategies.value[0].id).toBe(`${VAULT_ID}:S0`)
    expect(vault.strategies.value[1].id).toBe(`${VAULT_ID}:S1`)

    expect(registry.movements.kind).toBe('available')
    if (registry.movements.kind !== 'available') return
    expect(registry.movements.value[0].vaultId).toBe(VAULT_ID)
    expect(registry.movements.value[0].id).toBe('evt-1')
  })

  it('reports a missing vault as unavailable without inventing a vault', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          if (endpointId === 'vault') {
            return { ok: true, data: envelope({ runtime: {} }).data, meta: meta(), trace: {} as never }
          }
          const admin = adminEndpoint(endpointId)
          if (admin) return admin
          return { ok: true, data: {}, meta: meta(), trace: {} as never }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.vaults.kind).toBe('unavailable')
    if (registry.vaults.kind !== 'unavailable') return
    expect(registry.vaults.reason).toBe('no_contract_address_reported')
  })

  it('keeps a vault unavailable when the backend fails entirely', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockResolvedValue({
          ok: false,
          state: { status: 'UNAVAILABLE', reason: 'service_did_not_respond' },
          problem: null,
          keeper: null,
          trace: {} as never,
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.vaults.kind).toBe('unavailable')
    if (registry.vaults.kind !== 'unavailable') return
    expect(registry.vaults.reason).toBe('service_did_not_respond')
  })

  it('distinguishes a partial strategy read from zero and unavailable', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          switch (endpointId) {
            case 'vault':
              return { ok: true, data: vaultResponse().data, meta: meta(), trace: {} as never }
            case 'vault-strategies':
              return {
                ok: true,
                data: strategiesResponse({
                  strategies: {
                    status: 'PARTIAL',
                    value: [
                      {
                        pocket: 'S0',
                        label: 'Strategy 0',
                        targetBps: 5000,
                        actualBps: null,
                        driftBps: null,
                        isIdle: false,
                        enabled: true,
                      },
                    ],
                    reason: 'some_pocket_shares_unreadable',
                    provenance: 'chain',
                    freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
                  },
                }).data,
                meta: meta(),
                trace: {} as never,
              }
            case 'rwa-vault':
              return { ok: true, data: rwaResponse().data, meta: meta(), trace: {} as never }
            case 'rebalancing-status':
              return { ok: true, data: rebalancingResponse().data, meta: meta(), trace: {} as never }
            case 'series1-events':
              return { ok: true, data: eventsResponse().data, meta: meta(), trace: {} as never }
            case 'dashboard':
              return { ok: true, data: dashboardResponse().data, meta: meta(), trace: {} as never }
            default: {
              const admin = adminEndpoint(endpointId)
              if (admin) return admin
              throw new Error(`Unexpected endpoint: ${endpointId}`)
            }
          }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.vaults.kind).toBe('available')
    if (registry.vaults.kind !== 'available') return
    const [vault] = registry.vaults.value
    expect(vault.strategies.kind).toBe('available')
    if (vault.strategies.kind !== 'available') return
    expect(vault.strategies.value[0].actualBps).toBeNull()
    expect(vault.strategies.value[0].driftBps).toBeNull()
    expect(vault.deployedBps.kind).toBe('unavailable')
    expect(vault.worstDriftBps.kind).toBe('unavailable')
  })

  it('preserves a reported zero value without collapsing it into unavailable', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          switch (endpointId) {
            case 'vault':
              return {
                ok: true,
                data: vaultResponse({
                  snapshot: {
                    status: 'LIVE',
                    value: { asset: 'USDC', assetDecimals: 6, totalAssets: '0', totalShares: '0', navPerShare: '0' },
                    provenance: 'chain',
                    freshness: { asOf: '2026-07-28T08:00:00.000Z', stale: false },
                  },
                }).data,
                meta: meta(),
                trace: {} as never,
              }
            case 'vault-strategies':
              return { ok: true, data: strategiesResponse().data, meta: meta(), trace: {} as never }
            case 'rwa-vault':
              return { ok: true, data: rwaResponse().data, meta: meta(), trace: {} as never }
            case 'rebalancing-status':
              return { ok: true, data: rebalancingResponse().data, meta: meta(), trace: {} as never }
            case 'series1-events':
              return { ok: true, data: eventsResponse().data, meta: meta(), trace: {} as never }
            case 'dashboard':
              return { ok: true, data: dashboardResponse().data, meta: meta(), trace: {} as never }
            default: {
              const admin = adminEndpoint(endpointId)
              if (admin) return admin
              throw new Error(`Unexpected endpoint: ${endpointId}`)
            }
          }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.vaults.kind).toBe('available')
    if (registry.vaults.kind !== 'available') return
    const [vault] = registry.vaults.value
    expect(vault.totalAssetsAtomic.kind).toBe('available')
    if (vault.totalAssetsAtomic.kind !== 'available') return
    expect(vault.totalAssetsAtomic.value).toBe('0')
  })

  it('keeps the client and deployments as unavailable because no source exists', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          switch (endpointId) {
            case 'vault':
              return { ok: true, data: vaultResponse().data, meta: meta(), trace: {} as never }
            case 'vault-strategies':
              return { ok: true, data: strategiesResponse().data, meta: meta(), trace: {} as never }
            case 'rwa-vault':
              return { ok: true, data: rwaResponse().data, meta: meta(), trace: {} as never }
            case 'rebalancing-status':
              return { ok: true, data: rebalancingResponse().data, meta: meta(), trace: {} as never }
            case 'series1-events':
              return { ok: true, data: eventsResponse().data, meta: meta(), trace: {} as never }
            case 'dashboard':
              return { ok: true, data: dashboardResponse().data, meta: meta(), trace: {} as never }
            default: {
              const admin = adminEndpoint(endpointId, 'not-exposed')
              if (admin) return admin
              throw new Error(`Unexpected endpoint: ${endpointId}`)
            }
          }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.clients.kind).toBe('unavailable')
    expect(registry.deployments.kind).toBe('unavailable')
    if (registry.clients.kind !== 'unavailable') return
    if (registry.deployments.kind !== 'unavailable') return
    expect(registry.clients.endpoint).toBe('/api/v1/clients')
    expect(registry.deployments.endpoint).toBe('/api/v1/deployments')
  })

  it('raises the no_investor_record client exception when identity carries that reason', async () => {
    seedSession()
    vi.doMock('@/lib/backend/client', async () => {
      const actual = await vi.importActual<typeof import('@/lib/backend/client')>('@/lib/backend/client')
      return {
        ...actual,
        callBackend: vi.fn().mockImplementation(async (endpointId: string) => {
          switch (endpointId) {
            case 'vault':
              return { ok: true, data: vaultResponse().data, meta: meta(), trace: {} as never }
            case 'vault-strategies':
              return { ok: true, data: strategiesResponse().data, meta: meta(), trace: {} as never }
            case 'rwa-vault':
              return { ok: true, data: rwaResponse().data, meta: meta(), trace: {} as never }
            case 'rebalancing-status':
              return { ok: true, data: rebalancingResponse().data, meta: meta(), trace: {} as never }
            case 'series1-events':
              return { ok: true, data: eventsResponse().data, meta: meta(), trace: {} as never }
            case 'dashboard':
              return { ok: true, data: dashboardResponse().data, meta: meta(), trace: {} as never }
            default: {
              const admin = adminEndpoint(endpointId)
              if (admin) return admin
              throw new Error(`Unexpected endpoint: ${endpointId}`)
            }
          }
        }),
      }
    })
    const { loadAdminRegistry: load } = await import('@/lib/vaults/registry')

    const registry = await load('adrien')

    expect(registry.clientExceptions.kind).toBe('available')
    if (registry.clientExceptions.kind !== 'available') return
    expect(registry.clientExceptions.value).toHaveLength(1)
    expect(registry.clientExceptions.value[0].issue).toBe('MISSING_INVESTOR_RECORD')
  })
})
