import { seriesStateFrom, seriesExplanation, SERIES_REASON } from '@/lib/series-state'
import { describe, expect, it } from 'vitest'

describe('series-state', () => {
  it('stays on the fallback when the reason is absent or unknown', () => {
    expect(seriesExplanation(undefined, 'default')).toBe('default')
    expect(seriesExplanation({ status: 'LIVE', value: 1, reason: '' }, 'default')).toBe('default')
    expect(seriesExplanation({ status: 'LIVE', value: 1, reason: 'unknown' }, 'default')).toBe('default')
  })

  it('translates known reasons', () => {
    expect(seriesExplanation({ status: 'UNAVAILABLE', value: null, reason: 'db_error' }, 'x')).toBe(
      SERIES_REASON.db_error,
    )
  })

  it('decides the frame state from the backend status', () => {
    expect(seriesStateFrom(undefined, 'pending')).toEqual({ type: 'pending', explanation: 'pending' })
    expect(seriesStateFrom({ status: 'ERROR', value: null, reason: 'rpc_error' }, 'x')).toEqual({
      type: 'unavailable',
      explanation: SERIES_REASON.rpc_error,
    })
    expect(seriesStateFrom({ status: 'LIVE', value: null, reason: 'not_available' }, 'x')).toEqual({
      type: 'pending',
      explanation: SERIES_REASON.not_available,
    })
    expect(seriesStateFrom({ status: 'LIVE', value: { ok: true } }, 'x')).toEqual({ type: 'plotted' })
  })
})
