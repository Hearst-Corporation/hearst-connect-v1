import { authenticate, loginErrorMessage, requireSession } from '@/lib/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Parcours de connexion, du formulaire au cookie.
 *
 * Le backend est mocké au niveau de `fetch` : rien n'est simulé plus haut, de
 * sorte que ces tests exercent le vrai code de composition de la session.
 */

const BACKEND = 'https://backend.test'
const BACKEND_TOKEN = 'cGF5bG9hZA.c2lnbmF0dXJl'

let currentCookie: string | undefined
const redirects: string[] = []

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

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirects.push(url)
    // `redirect` de Next lève pour interrompre le rendu : on reproduit ce
    // contrat, sinon le code testé continuerait comme si de rien n'était.
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

function backendResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function loginBody(overrides: Record<string, unknown> = {}) {
  return {
    token: BACKEND_TOKEN,
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: { id: 'usr_1', email: 'adrien@hearstcorporation.io', role: 'admin' },
    ...overrides,
  }
}

beforeEach(() => {
  process.env.HEARST_API_URL = BACKEND
  process.env.AUTH_SECRET = 'un-secret-de-session-de-32-caracteres-au-moins'
  currentCookie = undefined
  redirects.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.HEARST_API_URL
  delete process.env.AUTH_SECRET
})

describe('connexion valide', () => {
  it('compose une session propriétaire à partir de la réponse backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse(loginBody())))

    const result = await authenticate('adrien@hearstcorporation.io', 'un-mot-de-passe')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session).toMatchObject({
      userId: 'usr_1',
      email: 'adrien@hearstcorporation.io',
      role: 'OWNER',
      backendToken: BACKEND_TOKEN,
    })
  })

  it('range le jeton NU même quand le backend le préfixe encore de « Bearer »', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(backendResponse(loginBody({ token: `Bearer ${BACKEND_TOKEN}` }))),
    )

    const result = await authenticate('adrien@hearstcorporation.io', 'x')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.session.backendToken).toBe(BACKEND_TOKEN)
  })
})

describe('connexion refusée', () => {
  it('mauvais mot de passe : message générique, sans détail technique', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse({ detail: 'bad password' }, 401)))

    const result = await authenticate('adrien@hearstcorporation.io', 'faux')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('invalid_credentials')
    expect(result.error).not.toMatch(/401|password|token/i)
  })

  it('un compte investisseur n’ouvre pas la console d’administration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        backendResponse(loginBody({ user: { id: 'usr_2', email: 'i@b.c', role: 'investor' } })),
      ),
    )

    const result = await authenticate('i@b.c', 'x')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('forbidden')
  })

  it('backend injoignable : aucun repli local, aucune session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    const result = await authenticate('adrien@hearstcorporation.io', 'x')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('unavailable')
    expect(currentCookie).toBeUndefined()
  })

  it('réponse backend malformée : la connexion n’aboutit pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse({ jwt: 'x' })))

    const result = await authenticate('adrien@hearstcorporation.io', 'x')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('malformed_response')
  })

  it('quota dépassé : message explicite de limitation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse({}, 429)))

    const result = await authenticate('adrien@hearstcorporation.io', 'x')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('rate_limited')
  })
})

describe('messages d’erreur', () => {
  it('sont en français et n’exposent ni jeton, ni statut HTTP, ni nom de variable', () => {
    const reasons = [
      'missing_fields',
      'invalid_credentials',
      'forbidden',
      'rate_limited',
      'unavailable',
      'malformed_response',
      'server_error',
      'not_configured',
    ] as const

    for (const reason of reasons) {
      const message = loginErrorMessage(reason)
      expect(message.length).toBeGreaterThan(0)
      expect(message).not.toMatch(/token|bearer|AUTH_SECRET|HEARST_API_URL|http|\b[45]\d\d\b/i)
    }
  })
})

describe('garde de la console', () => {
  it('redirige vers /login quand aucune session n’existe', async () => {
    await expect(requireSession()).rejects.toThrow(/NEXT_REDIRECT/)
    expect(redirects[0]).toBe('/login?reason=expired')
  })

  it('redirige vers /login quand la session a expiré', async () => {
    const { createToken } = await import('@/lib/session')
    currentCookie = createToken({
      userId: 'usr_1',
      email: 'adrien@hearstcorporation.io',
      name: 'adrien',
      role: 'OWNER',
      backendToken: BACKEND_TOKEN,
      expiresAt: Math.floor(Date.now() / 1000) - 1,
    })

    await expect(requireSession()).rejects.toThrow(/NEXT_REDIRECT/)
    expect(redirects[0]).toBe('/login?reason=expired')
  })

  it('laisse passer une session valide', async () => {
    const { createToken } = await import('@/lib/session')
    currentCookie = createToken({
      userId: 'usr_1',
      email: 'adrien@hearstcorporation.io',
      name: 'adrien',
      role: 'OWNER',
      backendToken: BACKEND_TOKEN,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    })

    const session = await requireSession()
    expect(session.userId).toBe('usr_1')
    expect(redirects).toHaveLength(0)
  })
})
