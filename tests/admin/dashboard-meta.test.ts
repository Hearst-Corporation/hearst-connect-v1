import { statusFromMeta, type EnvelopeMeta } from '@/lib/backend/client'
import { etatSourceLisible } from '@/lib/mouvements'
import { describe, expect, it } from 'vitest'

function meta(status: EnvelopeMeta['status']): EnvelopeMeta {
  return {
    status,
    source: 'dashboard',
    generatedAt: '2026-08-05T00:00:00.000Z',
    freshnessSeconds: null,
    version: '1',
    reason: null,
  }
}

describe('dashboard — statut agrégat (F-02)', () => {
  it('lit meta.status au lieu d’un booléen joignable', () => {
    expect(etatSourceLisible(statusFromMeta(meta('UNAVAILABLE')))).toBe('indisponible')
    expect(etatSourceLisible(statusFromMeta(meta('STALE')))).toBe('obsolète')
    expect(etatSourceLisible(statusFromMeta(meta('LIVE')))).toBe('en direct')
  })

  it('absence de meta retombe sur LIVE (contrat client)', () => {
    expect(etatSourceLisible(statusFromMeta(null))).toBe('en direct')
  })
})
