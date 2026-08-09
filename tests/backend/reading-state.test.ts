import { backendStateFrom, backendStateLabel } from '@/lib/backend/reading-state'
import { available, unavailable } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

describe('backendStateFrom — three user-facing states', () => {
  it('fresh LIVE → LIVE', () => {
    expect(backendStateFrom(available('42', { provenance: 'indexed', stale: false }))).toBe('LIVE')
    expect(backendStateLabel('LIVE')).toBe('Live')
  })

  it('STALE → ISSUE', () => {
    expect(backendStateFrom(available('42', { provenance: 'indexed', stale: true }))).toBe('ISSUE')
    expect(backendStateLabel('ISSUE')).toBe('Issue')
  })

  it('network unavailable → OFFLINE', () => {
    expect(
      backendStateFrom(unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'timeout' })),
    ).toBe('OFFLINE')
  })

  it('permission denied → ISSUE', () => {
    expect(
      backendStateFrom(unavailable({ endpoint: '/api/v1/clients', status: 'PERMISSION_DENIED', reason: 'admin' })),
    ).toBe('ISSUE')
  })
})
