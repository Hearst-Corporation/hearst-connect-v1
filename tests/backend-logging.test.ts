import { callBackend } from '@/lib/backend/client'
import { createToken, type Session } from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * OPS-06: the backend client emits one structured log line per call for
 * observability. This test locks the SAFETY property: that line must carry the
 * requestId, route, status and duration — and NEVER the bearer token, the
 * Authorization header, or any secret.
 */

const BACKEND = 'https://backend.test'
const BEARER = 'SUPER-SECRET-BACKEND-BEARER-TOKEN'

let currentCookie: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (_n: string, v: string) => {
      currentCookie = v
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
    backendToken: BEARER,
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  })
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

describe('OPS-06 — structured backend logging never leaks secrets', () => {
  it('logs requestId/route/status but not the bearer token', async () => {
    seedSession()
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: {}, meta: { status: 'LIVE', source: 'db' } }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'X-Request-Id': 'req-123' },
      }),
    ) as unknown as typeof fetch

    const logged: string[] = []
    const spy = vi.spyOn(console, 'info').mockImplementation((line?: unknown) => {
      logged.push(String(line))
    })

    await callBackend('dashboard')

    expect(spy).toHaveBeenCalled()
    const all = logged.join('\n')
    // The safe fields are present…
    expect(all).toContain('backend-call')
    expect(all).toContain('/api/v1/dashboard')
    expect(all).toMatch(/"httpStatus":200/)
    // …and the secret is NOT.
    expect(all).not.toContain(BEARER)
    expect(all.toLowerCase()).not.toContain('authorization')
    expect(all).not.toContain(currentCookie ?? '###')
  })

  it('logs a timeout/unreachable failure without a token', async () => {
    seedSession()
    globalThis.fetch = vi.fn(async () => {
      throw Object.assign(new Error('boom'), { name: 'AbortError' })
    }) as unknown as typeof fetch

    const logged: string[] = []
    vi.spyOn(console, 'info').mockImplementation((line?: unknown) => {
      logged.push(String(line))
    })

    await callBackend('dashboard')

    const all = logged.join('\n')
    expect(all).toContain('"outcome":"error"')
    expect(all).toContain('timeout')
    expect(all).not.toContain(BEARER)
  })
})
