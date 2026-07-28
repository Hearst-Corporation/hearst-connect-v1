import { fromBackendResolved, type BackendResolved } from '@/lib/backend/resolved-mapper'
import { formatCount, hasDisplayableValue, resolved } from '@/lib/resolved'
import { describe, expect, it } from 'vitest'

const ctx = { route: '/api/v1/dashboard', field: 'tvl', fetchedAt: null, requestId: 'req-1' }

describe('null ne devient jamais 0', () => {
  it('formatCount rend « — » pour null et undefined', () => {
    expect(formatCount(null)).toBe('—')
    expect(formatCount(undefined)).toBe('—')
  })

  it('formatCount rend bien 0 quand le backend a confirmé 0', () => {
    expect(formatCount(0)).toBe('0')
  })

  it('NaN et Infinity ne sont pas affichés comme des mesures', () => {
    expect(formatCount(Number.NaN)).toBe('—')
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('les états sans valeur ne portent aucune donnée', () => {
  it.each(['notConfigured', 'unavailable', 'notSupported', 'permissionDenied', 'error'] as const)(
    '%s expose value=null et n’est pas affichable',
    (kind) => {
      const state = resolved[kind]<number>('raison backend')
      expect(state.value).toBeNull()
      expect(hasDisplayableValue(state)).toBe(false)
    },
  )

  it('un état EMPTY reste distinct d’un zéro', () => {
    const state = resolved.empty<number[]>({ route: '/x' })
    expect(state.status).toBe('EMPTY')
    expect(state.value).toBeNull()
  })
})

describe('traduction du Resolved backend', () => {
  it('NOT_CONFIGURED ne devient jamais LIVE', () => {
    const field: BackendResolved<number> = {
      status: 'NOT_CONFIGURED',
      value: null,
      provenance: 'db',
      freshness: { asOf: null, ageSeconds: null, stale: false },
      reason: 'Source absente.',
    }
    const state = fromBackendResolved(field, ctx)
    expect(state.status).toBe('NOT_CONFIGURED')
    expect(state.value).toBeNull()
    expect(hasDisplayableValue(state)).toBe(false)
  })

  it('une donnée de provenance « fixture » est marquée SIMULATED et masquée', () => {
    const field: BackendResolved<number> = {
      status: 'LIVE',
      value: 1234,
      provenance: 'fixture',
      freshness: { asOf: '2026-07-27T00:00:00Z', ageSeconds: 10, stale: false },
    }
    const state = fromBackendResolved(field, ctx)
    expect(state.status).toBe('SIMULATED')
    expect(state.value).toBeNull()
    expect(state.reason).toMatch(/simulée/i)
  })

  it('un LIVE annoncé sans valeur est traité comme une erreur, pas comme un zéro', () => {
    const field: BackendResolved<number> = {
      status: 'LIVE',
      value: null,
      provenance: 'live',
      freshness: { asOf: null, ageSeconds: null, stale: false },
    }
    const state = fromBackendResolved(field, ctx)
    expect(state.status).toBe('ERROR')
    expect(state.value).toBeNull()
  })

  it('STALE conserve la valeur mais signale la fraîcheur', () => {
    const field: BackendResolved<number> = {
      status: 'STALE',
      value: 7,
      provenance: 'db',
      freshness: { asOf: '2026-07-01T00:00:00Z', ageSeconds: 9000, stale: true },
      reason: 'Dernière synchronisation ancienne.',
    }
    const state = fromBackendResolved(field, ctx)
    expect(state.status).toBe('STALE')
    expect(state.value).toBe(7)
    expect(state.provenance.fetchedAt).toBe('2026-07-01T00:00:00Z')
  })

  it('un champ absent de la réponse devient NOT_SUPPORTED, pas une estimation', () => {
    const state = fromBackendResolved(undefined, ctx)
    expect(state.status).toBe('NOT_SUPPORTED')
    expect(state.value).toBeNull()
  })
})
