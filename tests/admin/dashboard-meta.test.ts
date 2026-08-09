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

describe('dashboard — aggregate status (F-02)', () => {
  it('reads meta.status instead of a reachable boolean', () => {
    expect(etatSourceLisible(statusFromMeta(meta('UNAVAILABLE')))).toBe('unavailable')
    expect(etatSourceLisible(statusFromMeta(meta('STALE')))).toBe('stale')
    expect(etatSourceLisible(statusFromMeta(meta('LIVE')))).toBe('live')
  })

  it('missing meta is UNAVAILABLE, never LIVE (VER-10 — no freshness declared)', () => {
    // Une réponse sans métadonnée n'a pas déclaré son statut de fraîcheur :
    // l'afficher « live » certifierait un frais que rien n'établit. Même
    // doctrine que src/lib/statut-affichage.ts (STATUT_INCONNU = UNAVAILABLE).
    expect(etatSourceLisible(statusFromMeta(null))).toBe('unavailable')
  })
})
