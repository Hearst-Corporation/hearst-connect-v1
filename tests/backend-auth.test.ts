import {
  authorizationHeader,
  fromBackendRole,
  loginWithBackend,
  normalizeBearerToken,
  parseLoginResponse,
  toBackendRole,
} from '@/lib/backend/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrat d'authentification frontend → backend.
 *
 * Le backend est l'autorité : ce frontend ne signe plus aucun jeton. Ces tests
 * vérifient ce qu'il fait du jeton reçu — et surtout qu'il ne produit JAMAIS un
 * en-tête « Bearer Bearer … ».
 */

const BACKEND = 'https://backend.test'

/** Réponse conforme au contrat cible, jeton nu. */
function loginBody(overrides: Record<string, unknown> = {}) {
  return {
    token: 'cGF5bG9hZA.c2lnbmF0dXJl',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: { id: 'usr_1', email: 'Adrien@hearstcorporation.io', role: 'admin' },
    ...overrides,
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  process.env.HEARST_API_URL = BACKEND
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.HEARST_API_URL
})

describe('normalisation du jeton porteur', () => {
  it('laisse intact un jeton déjà nu', () => {
    expect(normalizeBearerToken('abc.def')).toBe('abc.def')
  })

  it('retire le préfixe « Bearer » que renvoie encore le déploiement courant', () => {
    expect(normalizeBearerToken('Bearer abc.def')).toBe('abc.def')
  })

  it('accepte la casse et les espaces multiples', () => {
    expect(normalizeBearerToken('  bearer   abc.def  ')).toBe('abc.def')
    expect(normalizeBearerToken('BEARER abc.def')).toBe('abc.def')
  })

  it('retire un double préfixe accidentel', () => {
    expect(normalizeBearerToken('Bearer Bearer abc.def')).toBe('abc.def')
  })

  it('est idempotente', () => {
    const once = normalizeBearerToken('Bearer abc.def')
    expect(normalizeBearerToken(once)).toBe(once)
  })
})

describe('en-tête Authorization', () => {
  it('compose un seul « Bearer » depuis un jeton nu', () => {
    expect(authorizationHeader('abc.def')).toBe('Bearer abc.def')
  })

  it('ne produit JAMAIS « Bearer Bearer » depuis un jeton déjà préfixé', () => {
    const header = authorizationHeader('Bearer abc.def')
    expect(header).toBe('Bearer abc.def')
    expect(header).not.toMatch(/Bearer\s+Bearer/i)
  })
})

describe('traduction des rôles', () => {
  it('OWNER et ADMIN parlent au backend en admin', () => {
    expect(toBackendRole('OWNER')).toBe('admin')
    expect(toBackendRole('ADMIN')).toBe('admin')
  })

  it('MEMBER n’obtient aucun rôle backend', () => {
    expect(toBackendRole('MEMBER')).toBeNull()
  })

  it('un admin backend devient propriétaire côté frontend (V1 single-owner)', () => {
    expect(fromBackendRole('admin')).toBe('OWNER')
  })

  it('un investor n’ouvre PAS la console d’administration', () => {
    expect(fromBackendRole('investor')).toBeNull()
  })
})

describe('lecture de la réponse de connexion', () => {
  it('accepte le contrat cible et normalise l’e-mail', () => {
    const parsed = parseLoginResponse(loginBody())
    expect(parsed).not.toBeNull()
    expect(parsed?.userId).toBe('usr_1')
    expect(parsed?.email).toBe('adrien@hearstcorporation.io')
    expect(parsed?.backendRole).toBe('admin')
    expect(parsed?.token).toBe('cGF5bG9hZA.c2lnbmF0dXJl')
  })

  it('accepte l’ancien format préfixé et range le jeton NU', () => {
    const parsed = parseLoginResponse(loginBody({ token: 'Bearer cGF5bG9hZA.c2lnbmF0dXJl' }))
    expect(parsed?.token).toBe('cGF5bG9hZA.c2lnbmF0dXJl')
    expect(parsed?.token.startsWith('Bearer')).toBe(false)
  })

  it('rejette une réponse sans jeton, sans utilisateur ou sans expiration', () => {
    expect(parseLoginResponse(loginBody({ token: '' }))).toBeNull()
    expect(parseLoginResponse(loginBody({ user: undefined }))).toBeNull()
    expect(parseLoginResponse(loginBody({ expiresAt: undefined }))).toBeNull()
    expect(parseLoginResponse(loginBody({ expiresAt: 'pas-une-date' }))).toBeNull()
  })

  it('rejette un rôle hors contrat plutôt que de le rétrograder', () => {
    expect(parseLoginResponse(loginBody({ user: { id: 'u', email: 'a@b.c', role: 'superuser' } }))).toBeNull()
  })

  it('rejette un identifiant absent : un e-mail n’est pas un identifiant', () => {
    expect(parseLoginResponse(loginBody({ user: { email: 'a@b.c', role: 'admin' } }))).toBeNull()
  })

  it('rejette une réponse qui n’est pas un objet', () => {
    expect(parseLoginResponse(null)).toBeNull()
    expect(parseLoginResponse('token')).toBeNull()
    expect(parseLoginResponse([loginBody()])).toBeNull()
  })
})

describe('appel de connexion au backend', () => {
  it('poste sur /api/v1/auth/login et rend des identifiants normalisés', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, loginBody()))
    vi.stubGlobal('fetch', fetchSpy)

    const result = await loginWithBackend('Adrien@hearstcorporation.io', 'un-mot-de-passe')

    expect(result.ok).toBe(true)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${BACKEND}/api/v1/auth/login`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      email: 'adrien@hearstcorporation.io',
      password: 'un-mot-de-passe',
    })
    if (result.ok) expect(result.credentials.token).toBe('cGF5bG9hZA.c2lnbmF0dXJl')
  })

  it('traduit un 401 en identifiants invalides', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'nope' })))
    const result = await loginWithBackend('a@b.c', 'faux')
    expect(result).toMatchObject({ ok: false, reason: 'invalid_credentials' })
  })

  it('traduit un 429 en limitation de débit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, {})))
    const result = await loginWithBackend('a@b.c', 'x')
    expect(result).toMatchObject({ ok: false, reason: 'rate_limited' })
  })

  it('traduit un 5xx en service indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, {})))
    const result = await loginWithBackend('a@b.c', 'x')
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
  })

  it('traduit un backend injoignable en service indisponible, sans repli local', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const result = await loginWithBackend('a@b.c', 'x')
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
  })

  it('refuse une réponse 200 hors contrat', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { access_token: 'x' })))
    const result = await loginWithBackend('a@b.c', 'x')
    expect(result).toMatchObject({ ok: false, reason: 'malformed_response' })
  })

  it('refuse une réponse 200 dont le corps n’est pas du JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>oups</html>', { status: 200 })),
    )
    const result = await loginWithBackend('a@b.c', 'x')
    expect(result).toMatchObject({ ok: false, reason: 'malformed_response' })
  })

  it('n’émet AUCUNE requête si le backend n’est pas configuré', async () => {
    delete process.env.HEARST_API_URL
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await loginWithBackend('a@b.c', 'x')

    expect(result).toMatchObject({ ok: false, reason: 'not_configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
