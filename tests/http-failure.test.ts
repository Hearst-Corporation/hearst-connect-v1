import { stateForHttpFailure } from '@/lib/backend/http-failure'
import { describe, expect, it } from 'vitest'

const problem = (code: string, detail = 'd') => ({
  type: 't',
  title: 't',
  status: 503,
  code,
  detail,
  requestId: 'req-1',
})

describe('stateForHttpFailure', () => {
  it('mappe les codes HTTP courants', () => {
    expect(stateForHttpFailure(401, null, '/r', 'id').status).toBe('PERMISSION_DENIED')
    expect(stateForHttpFailure(403, null, '/r', 'id').status).toBe('PERMISSION_DENIED')
    expect(stateForHttpFailure(429, null, '/r', 'id').status).toBe('UNAVAILABLE')
    expect(stateForHttpFailure(504, null, '/r', 'id').status).toBe('UNAVAILABLE')
    expect(stateForHttpFailure(500, null, '/r', 'id').status).toBe('ERROR')
  })

  it('distingue NOT_CONFIGURED sur 503', () => {
    expect(stateForHttpFailure(503, problem('NOT_CONFIGURED'), '/r', 'id').status).toBe('NOT_CONFIGURED')
    expect(stateForHttpFailure(503, problem('OTHER'), '/r', 'id').status).toBe('UNAVAILABLE')
  })

  it('lit reason sur 501 keeper', () => {
    const state = stateForHttpFailure(501, { status: 'x', reason: 'not_supported_by_contract' }, '/r', 'id')
    expect(state.status).toBe('NOT_SUPPORTED')
    expect(state.reason).toMatch(/not_supported_by_contract/)
  })
})
