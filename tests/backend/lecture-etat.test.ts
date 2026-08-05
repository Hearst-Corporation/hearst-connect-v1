import { etatBackend, libelleEtatBackend } from '@/lib/backend/lecture-etat'
import { available, unavailable } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

describe('etatBackend — trois états utilisateur', () => {
  it('LIVE frais → EN_DIRECT', () => {
    expect(etatBackend(available('42', { provenance: 'indexed', stale: false }))).toBe('EN_DIRECT')
    expect(libelleEtatBackend('EN_DIRECT')).toBe('En direct')
  })

  it('STALE → PROBLEME', () => {
    expect(etatBackend(available('42', { provenance: 'indexed', stale: true }))).toBe('PROBLEME')
    expect(libelleEtatBackend('PROBLEME')).toBe('Problème')
  })

  it('indisponible réseau → HORS_LIGNE', () => {
    expect(
      etatBackend(unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'timeout' })),
    ).toBe('HORS_LIGNE')
  })

  it('permission refusée → PROBLEME', () => {
    expect(
      etatBackend(unavailable({ endpoint: '/api/v1/clients', status: 'PERMISSION_DENIED', reason: 'admin' })),
    ).toBe('PROBLEME')
  })
})
