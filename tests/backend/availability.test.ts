import { availabilityFromResolved } from '@/lib/backend/availability'
import { isAvailable, measuredCount, signalOf } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

describe('availabilityFromResolved + measuredCount (F-05)', () => {
  const endpoint = '/api/v1/series1/events'

  it('un champ STALE avec valeur ne badge jamais live', () => {
    const block = {
      status: 'STALE',
      value: [{ id: '1' }, { id: '2' }],
      reason: 'indexer_lagging',
    }
    const count = measuredCount(availabilityFromResolved(block, endpoint))
    expect(isAvailable(count)).toBe(true)
    if (isAvailable(count)) {
      expect(count.value).toBe('2')
      expect(signalOf(count)).toBe('stale')
    }
  })

  it('un champ LIVE avec valeur badge live', () => {
    const block = { status: 'LIVE', value: [{ id: '1' }] }
    const count = measuredCount(availabilityFromResolved(block, endpoint))
    expect(signalOf(count)).toBe('live')
  })

  it('une valeur absente reste indisponible', () => {
    const block = { status: 'UNAVAILABLE', value: null, reason: 'events_unreachable' }
    const count = measuredCount(availabilityFromResolved<readonly { id: string }[]>(block, endpoint))
    expect(isAvailable(count)).toBe(false)
  })
})
