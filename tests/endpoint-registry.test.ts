import { BACKEND_ENDPOINTS, endpointById, endpointsByCategory, resolvePath } from '@/lib/backend/endpoints'
import { describe, expect, it } from 'vitest'

/** Les 33 routes du contrat backend, listées ici indépendamment du registre. */
const CONTRACT_PATHS = [
  'GET /health',
  'GET /ready',
  'GET /api/v1/runtime',
  'GET /api/v1/dashboard',
  'GET /api/v1/profile',
  'GET /api/v1/series1/events',
  'GET /api/v1/events/rebalancing',
  'GET /api/v1/clients',
  'GET /api/v1/deployments',
  'GET /api/v1/compliance',
  'GET /api/v1/vault',
  'GET /api/v1/vault/strategies',
  'GET /api/v1/strategies/:index',
  'GET /api/v1/rwa-vault',
  'GET /api/v1/rebalancing/status',
  'GET /api/v1/mining',
  'GET /api/v1/mining/metrics/onchain',
  'GET /api/v1/mining/electricity',
  'GET /api/v1/btc',
  'GET /api/v1/product/factsheet',
  'GET /api/v1/backtest/historical',
  'GET /api/v1/ai/context/dashboard',
  'GET /api/v1/ai/context/btc',
  'GET /api/v1/ai/context/mining',
  'POST /api/v1/auth/login',
  'POST /api/v1/mining/metrics/report',
  'POST /api/v1/mining/electricity/pay',
  'POST /api/v1/admin/indexer/trigger',
  'POST /api/v1/admin/users',
  'POST /api/v1/rebalancing/execute',
  'POST /api/v1/rwa-vault',
  'POST /api/v1/btc-deposit/initiate',
  'POST /api/v1/btc-deposit/complete',
]

describe('registre des endpoints', () => {
  it('couvre exactement les 33 routes du contrat', () => {
    const registered = BACKEND_ENDPOINTS.map((e) => `${e.method} ${e.path}`).sort()
    expect(registered).toEqual([...CONTRACT_PATHS].sort())
    expect(BACKEND_ENDPOINTS).toHaveLength(33)
  })

  it('ne contient aucun doublon d’identifiant ni de route', () => {
    const ids = BACKEND_ENDPOINTS.map((e) => e.id)
    const routes = BACKEND_ENDPOINTS.map((e) => `${e.method} ${e.path}`)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('assigne chaque endpoint à une surface produit', () => {
    for (const endpoint of BACKEND_ENDPOINTS) {
      expect(endpoint.surface).toMatch(/^\/(admin|login)/)
    }
  })

  it('répartit les catégories conformément au contrat', () => {
    expect(endpointsByCategory('probe')).toHaveLength(6)
    expect(endpointsByCategory('business')).toHaveLength(18)
    expect(endpointsByCategory('ai-context')).toHaveLength(3)
    expect(endpointsByCategory('keeper')).toHaveLength(6)
  })

  it('marque non enveloppées exactement les routes que le contrat exclut', () => {
    const bare = BACKEND_ENDPOINTS.filter((e) => !e.enveloped).map((e) => e.id).sort()
    expect(bare).toEqual(
      [
        'admin-indexer-trigger',
        'admin-users',
        'auth-login',
        'ai-context-btc',
        'ai-context-dashboard',
        'ai-context-mining',
        'health',
        'keeper-btc-deposit-complete',
        'keeper-btc-deposit-initiate',
        'keeper-electricity-pay',
        'keeper-mining-report',
        'keeper-rebalancing-execute',
        'keeper-rwa-vault',
        'ready',
        'runtime',
      ].sort(),
    )
  })

  it('exige le rôle admin sur les routes que le backend protège', () => {
    const adminOnly = BACKEND_ENDPOINTS.filter((e) => e.auth === 'admin').map((e) => e.id)
    expect(adminOnly).toContain('rebalancing-status')
    // Les six routes Keeper sont toutes admin.
    for (const endpoint of endpointsByCategory('keeper')) {
      expect(endpoint.auth).toBe('admin')
    }
  })

  it('résout les paramètres de chemin et refuse un paramètre manquant', () => {
    const detail = endpointById('strategy-detail')
    expect(resolvePath(detail, { index: 3 })).toBe('/api/v1/strategies/3')
    expect(() => resolvePath(detail)).toThrow(/index/)
  })

  it('BAPI-04 : un paramètre hors chemin devient une query string, jamais ignoré', () => {
    const events = endpointById('series1-events')
    // `limit` n'est pas un segment de chemin : il doit apparaître en query.
    expect(resolvePath(events, { limit: 50 })).toBe('/api/v1/series1/events?limit=50')
    // Sans paramètre, pas de « ? » superflu.
    expect(resolvePath(events)).toBe('/api/v1/series1/events')
    // Chemin ET query coexistent, le segment consommé n'est pas redupliqué.
    const detail = endpointById('strategy-detail')
    expect(resolvePath(detail, { index: 2, limit: 10 })).toBe('/api/v1/strategies/2?limit=10')
  })

  it('pointe les lectures coffre vers /admin/vaults (F-10)', () => {
    for (const id of ['vault', 'vault-strategies', 'strategy-detail', 'rwa-vault', 'rebalancing-status']) {
      expect(endpointById(id).surface).toBe('/admin/vaults')
      expect(endpointById(id).surface).not.toBe('/admin/vault')
    }
  })

  it('réconcilie les lectures mining dédiées sur /admin/produit (F-07)', () => {
    for (const id of ['mining-onchain', 'mining-electricity']) {
      const endpoint = endpointById(id)
      expect(endpoint.surface).toBe('/admin/produit')
      expect(endpoint.caveat).toMatch(/admin\/produit/i)
    }
  })

  it('rejette un identifiant hors registre', () => {
    expect(() => endpointById('inexistant')).toThrow(/unknown to the registry|unknown/i)
  })
})
