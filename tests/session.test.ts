import {
  createToken,
  endSession,
  getSession,
  publicUser,
  SESSION_COOKIE,
  startSession,
  verifyToken,
  type Session,
} from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Session serveur : ce qui est scellé, ce qui expire, et ce qui ne franchit
 * jamais la frontière serveur → client.
 */

const SECRET = 'un-secret-de-session-de-32-caracteres-au-moins'
const BACKEND_TOKEN = 'cGF5bG9hZA.c2lnbmF0dXJl'

/** Faux magasin de cookies : on inspecte les OPTIONS posées, pas seulement la valeur. */
type CookieCall = { name: string; value: string; options: Record<string, unknown> }
const calls: CookieCall[] = []
const deletions: string[] = []
let stored: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string, options: Record<string, unknown>) => {
      calls.push({ name, value, options })
      stored = value
    },
    get: (name: string) => (name === SESSION_COOKIE && stored !== undefined ? { name, value: stored } : undefined),
    delete: (name: string) => {
      deletions.push(name)
      stored = undefined
    },
  }),
}))

function session(overrides: Partial<Session> = {}): Session {
  return {
    userId: 'usr_1',
    email: 'adrien@hearstcorporation.io',
    name: 'adrien',
    role: 'OWNER',
    backendToken: BACKEND_TOKEN,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }
}

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET
  calls.length = 0
  deletions.length = 0
  stored = undefined
})

afterEach(() => {
  delete process.env.AUTH_SECRET
  vi.unstubAllEnvs()
})

describe('scellement de la session', () => {
  it('porte userId, email, rôle, jeton backend et échéance', () => {
    const restored = verifyToken(createToken(session()))
    expect(restored).toMatchObject({
      userId: 'usr_1',
      email: 'adrien@hearstcorporation.io',
      role: 'OWNER',
      backendToken: BACKEND_TOKEN,
    })
    expect(typeof restored?.expiresAt).toBe('number')
  })

  it('rejette un cookie dont la signature a été altérée', () => {
    const token = createToken(session())
    const [data] = token.split('.')
    expect(verifyToken(`${data}.signature-bidon`)).toBeNull()
  })

  it('rejette un cookie signé avec un autre secret', () => {
    const token = createToken(session())
    process.env.AUTH_SECRET = 'un-AUTRE-secret-de-32-caracteres-au-moins-lui-aussi'
    expect(verifyToken(token)).toBeNull()
  })

  it('rejette un cookie sans jeton backend', () => {
    // Session forgée à la main : un cookie hérité de l'ancien format, sans
    // jeton, ne doit pas ouvrir la console.
    const legacy = createToken({ ...session(), backendToken: '' })
    expect(verifyToken(legacy)).toBeNull()
  })

  it('rejette un cookie expiré', () => {
    const expired = createToken(session({ expiresAt: Math.floor(Date.now() / 1000) - 1 }))
    expect(verifyToken(expired)).toBeNull()
  })

  it('rejette une valeur vide ou malformée', () => {
    expect(verifyToken(undefined)).toBeNull()
    expect(verifyToken('')).toBeNull()
    expect(verifyToken('pas-un-jeton')).toBeNull()
  })
})

describe('cookie posé', () => {
  it('est httpOnly, SameSite=Lax, Path=/ et aligné sur l’échéance du jeton backend', async () => {
    const s = session({ expiresAt: Math.floor(Date.now() / 1000) + 600 })
    const started = await startSession(s)

    expect(started).toBe(true)
    expect(calls).toHaveLength(1)
    const { name, options } = calls[0]
    expect(name).toBe(SESSION_COOKIE)
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    expect(options.path).toBe('/')
    // Aligné à la seconde près sur l'expiration du jeton — plus de 7 jours fixes.
    expect(options.maxAge as number).toBeGreaterThan(590)
    expect(options.maxAge as number).toBeLessThanOrEqual(600)
  })

  it('est Secure en production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await startSession(session())
    expect(calls[0].options.secure).toBe(true)
  })

  it('ne pose AUCUN cookie pour un jeton déjà expiré', async () => {
    const started = await startSession(session({ expiresAt: Math.floor(Date.now() / 1000) - 10 }))
    expect(started).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('la session relue depuis le cookie porte bien le jeton backend', async () => {
    await startSession(session())
    const current = await getSession()
    expect(current?.backendToken).toBe(BACKEND_TOKEN)
  })

  it('la déconnexion détruit le cookie et la session devient nulle', async () => {
    await startSession(session())
    await endSession()
    expect(deletions).toContain(SESSION_COOKIE)
    expect(await getSession()).toBeNull()
  })
})

describe('frontière serveur → client', () => {
  it('publicUser retire le jeton backend et l’échéance', () => {
    const exposed = publicUser(session())
    expect(exposed).toEqual({
      userId: 'usr_1',
      email: 'adrien@hearstcorporation.io',
      name: 'adrien',
      role: 'OWNER',
    })
    expect(JSON.stringify(exposed)).not.toContain(BACKEND_TOKEN)
    expect(Object.keys(exposed)).not.toContain('backendToken')
  })
})
