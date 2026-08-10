import { statusFromMeta, type EnvelopeMeta } from '@/lib/backend/client'
import { readableSourceState } from '@/lib/movements'
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
    expect(readableSourceState(statusFromMeta(meta('UNAVAILABLE')))).toBe('unavailable')
    expect(readableSourceState(statusFromMeta(meta('STALE')))).toBe('stale')
    expect(readableSourceState(statusFromMeta(meta('LIVE')))).toBe('live')
  })

  it('missing meta is UNAVAILABLE, never LIVE (VER-10 — no freshness declared)', () => {
    // A response with no metadata has not declared its freshness status:
    // showing it as "live" would certify a freshness that nothing establishes.
    // Same doctrine as src/lib/display-status.ts (UNKNOWN_STATUS = UNAVAILABLE).
    expect(readableSourceState(statusFromMeta(null))).toBe('unavailable')
  })
})
