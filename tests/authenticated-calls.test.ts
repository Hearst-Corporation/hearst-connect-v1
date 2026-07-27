import { callBackend } from '@/lib/backend/client'
import { createToken, type Session } from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Appels authentifiés : l'en-tête part de la session serveur, une seule fois
 * préfixé, et rien ne part quand la session manque.
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

function envelope(): Response {
  return new Response(
    JSON.stringify({
      data: {},
      meta: {
        status: 'LIVE',
        source: 'db',
        generatedAt: new Date().toISOString(),
        freshnessSeconds: 0,
        version: 'v1',
        reason: null,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  process.env.HEARST_API_URL = BACKEND
  process.env.AUTH_SECRET = 'un-secret-de-session-de-32-caracteres-au-moins'
  currentCookie = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.HEARST_API_URL
  delete process.env.AUTH_SECRET
})

describe('en-tête d’autorisation des routes protégées', () => {
  it('envoie exactement un « Bearer » avec le jeton de la session', async () => {
    seedSession()
    const fetchSpy = vi.fn().mockResolvedValue(envelope())
    vi.stubGlobal('fetch', fetchSpy)

    await callBackend('dashboard')

    const [, init] = fetchSpy.mock.calls[0]
    expect(init.headers.Authorization).toBe(`Bearer ${BACKEND_TOKEN}`)
    expect(init.headers.Authorization).not.toMatch(/Bearer\s+Bearer/i)
  })

  it('ne double pas le préfixe même si un jeton préfixé a fini dans la session', async () => {
    seedSession({ backendToken: `Bearer ${BACKEND_TOKEN}` })
    const fetchSpy = vi.fn().mockResolvedValue(envelope())
    vi.stubGlobal('fetch', fetchSpy)

    await callBackend('dashboard')

    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${BACKEND_TOKEN}`)
  })

  it('n’émet AUCUNE requête sans session : accès refusé, pas de valeur de repli', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await callBackend('dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.state.status).toBe('PERMISSION_DENIED')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuse un rôle MEMBER avant tout appel réseau', async () => {
    seedSession({ role: 'MEMBER' })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await callBackend('dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.state.status).toBe('PERMISSION_DENIED')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('n’envoie aucun en-tête d’autorisation sur une route publique', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await callBackend('health')

    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('traduit un 401 backend en accès refusé, sans exposer le corps brut', async () => {
    seedSession()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'expired' }), { status: 401 })),
    )

    const result = await callBackend('dashboard')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.state.status).toBe('PERMISSION_DENIED')
  })
})
