import { apiGet } from '@/lib/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE = 'https://connect-api.hearst.app'

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function problem(status: number, code: string, detail: string) {
  return {
    type: `https://hearst-connect-backend.dev/errors/${code.toLowerCase()}`,
    title: code,
    status,
    code,
    detail,
    requestId: 'req-abc-123',
  }
}

beforeEach(() => {
  process.env.HEARST_API_URL = BASE
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.HEARST_API_URL
  delete process.env.HEARST_API_TOKEN
})

describe('configuration absente', () => {
  it("n'émet aucune requête et rend NOT_CONFIGURED quand l'URL manque", async () => {
    delete process.env.HEARST_API_URL
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await apiGet('/api/v1/dashboard')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failure.status).toBe('NOT_CONFIGURED')
  })
})

describe('traduction des erreurs HTTP', () => {
  it.each([
    [401, 'UNAUTHORIZED', 'PERMISSION_DENIED'],
    [403, 'UNAUTHORIZED', 'PERMISSION_DENIED'],
    [429, 'RATE_LIMITED', 'UNAVAILABLE'],
    [504, 'GATEWAY_TIMEOUT', 'UNAVAILABLE'],
    [500, 'INTERNAL_ERROR', 'ERROR'],
  ])('HTTP %i → %s', async (status, code, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, problem(status, code, 'Détail backend.'))))

    const result = await apiGet('/api/v1/dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.status).toBe(expected)
      // Le requestId doit remonter jusqu'à l'UI pour être affichable.
      expect(result.failure.provenance.requestId).toBe('req-abc-123')
      expect(result.failure.value).toBeNull()
    }
  })

  it('503 NOT_CONFIGURED est distingué d’une indisponibilité', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, problem(503, 'NOT_CONFIGURED', 'Pas de clé.'))))
    const result = await apiGet('/api/v1/vault')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failure.status).toBe('NOT_CONFIGURED')
  })

  it('503 DATABASE_UNAVAILABLE reste une indisponibilité', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, problem(503, 'DATABASE_UNAVAILABLE', 'DB.'))))
    const result = await apiGet('/api/v1/vault')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failure.status).toBe('UNAVAILABLE')
  })

  it("501 Keeper (KeeperActionResult, sans champ code) n'est jamais un succès", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(501, { status: 'not_supported', reason: 'not_supported_by_contract', detail: 'Non implémenté.' }),
      ),
    )

    const result = await apiGet('/api/v1/rwa-vault')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.status).toBe('NOT_SUPPORTED')
      expect(result.failure.value).toBeNull()
    }
  })
})

describe('réseau et contrat', () => {
  it('un backend injoignable rend UNAVAILABLE sans aucune donnée antérieure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    const result = await apiGet('/api/v1/dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.status).toBe('UNAVAILABLE')
      expect(result.failure.value).toBeNull()
    }
  })

  it('une réponse 2xx hors enveloppe est refusée plutôt qu’interprétée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { tvl: 42 })))

    const result = await apiGet('/api/v1/dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failure.status).toBe('ERROR')
  })

  it('une enveloppe valide passe, avec meta et quota de requêtes', async () => {
    const envelope = {
      data: { items: [] },
      meta: {
        status: 'LIVE',
        source: 'database',
        generatedAt: '2026-07-27T10:00:00Z',
        freshnessSeconds: 3,
        version: 'v1',
        reason: null,
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, envelope, { 'X-RateLimit-Remaining': '58', 'X-Request-Id': 'r-9' })),
    )

    const result = await apiGet<{ items: unknown[] }>('/api/v1/dashboard')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toEqual([])
      expect(result.meta?.status).toBe('LIVE')
      expect(result.rateLimitRemaining).toBe(58)
      expect(result.requestId).toBe('r-9')
    }
  })

  it('transmet le Bearer et un X-Request-Id de corrélation', async () => {
    process.env.HEARST_API_TOKEN = 'secret-token'
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { data: {}, meta: {} }))
    vi.stubGlobal('fetch', fetchSpy)

    await apiGet('/api/v1/profile')

    const headers = fetchSpy.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret-token')
    expect(headers['X-Request-Id']).toMatch(/[0-9a-f-]{36}/)
  })
})
