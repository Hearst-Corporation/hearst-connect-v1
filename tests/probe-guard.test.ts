import { createToken, type Session } from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ARCH-01 / BAPI-01 regression: the API Explorer Server Action must refuse an
 * unauthenticated caller. A Server Action does not traverse the /admin layout,
 * so nothing but its own guard protects it — the audit proved an anonymous
 * replay returned a full probe result. This test locks the guard in place.
 */

const BACKEND = 'https://backend.test'
const BACKEND_TOKEN = 'cGF5bG9hZA.c2lnbmF0dXJl'

let currentCookie: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (_name: string, value: string) => {
      currentCookie = value
    },
    get: () => (currentCookie === undefined ? undefined : { name: 'hearst_session', value: currentCookie }),
    delete: () => {
      currentCookie = undefined
    },
  }),
}))

function seedSession(overrides: Partial<Session> = {}) {
  currentCookie = createToken({
    userId: 'usr_1',
    email: 'adrien@hearstcorporation.io',
    name: 'adrien',
    role: 'OWNER',
    backendToken: BACKEND_TOKEN,
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  })
}

function form(endpointId: string): FormData {
  const fd = new FormData()
  fd.set('endpointId', endpointId)
  return fd
}

const realFetch = globalThis.fetch

beforeEach(() => {
  process.env.AUTH_SECRET = 'x'.repeat(48)
  process.env.HEARST_API_URL = BACKEND
  currentCookie = undefined
})

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = realFetch
})

describe('probeEndpoint — session guard (ARCH-01)', () => {
  it('refuses an anonymous caller and sends NOTHING to the backend', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('network must not be reached')))
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const { probeEndpoint } = await import('@/lib/backend/probe')

    const outcome = await probeEndpoint(null, form('health'))

    expect(outcome.status).toBe('PERMISSION_DENIED')
    expect(outcome.trace.httpStatus).toBeNull() // no call happened
    expect(fetchSpy).not.toHaveBeenCalled() // proven: no backend request
  })

  it('refuses a MEMBER session and sends NOTHING to the backend', async () => {
    seedSession({ role: 'MEMBER' })
    const fetchSpy = vi.fn(() => Promise.reject(new Error('network must not be reached')))
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const { probeEndpoint } = await import('@/lib/backend/probe')

    const outcome = await probeEndpoint(null, form('health'))

    expect(outcome.status).toBe('PERMISSION_DENIED')
    expect(outcome.trace.httpStatus).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('with a valid session, the guard lets a public read through', async () => {
    seedSession()
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as unknown as typeof fetch
    const { probeEndpoint } = await import('@/lib/backend/probe')

    const outcome = await probeEndpoint(null, form('health'))

    // The guard passed: we get a real outcome, not the permission refusal.
    expect(outcome.status).not.toBe('PERMISSION_DENIED')
    expect(outcome.endpointId).toBe('health')
  })

  it('a non-string endpointId field is treated as empty, never coerced', async () => {
    seedSession()
    const { probeEndpoint } = await import('@/lib/backend/probe')
    const fd = new FormData()
    fd.set('endpointId', new File(['x'], 'x.txt'))

    const outcome = await probeEndpoint(null, fd)

    // Empty id → NOT_SUPPORTED refusal, never a probe of "[object File]".
    expect(outcome.status).toBe('NOT_SUPPORTED')
  })
})
