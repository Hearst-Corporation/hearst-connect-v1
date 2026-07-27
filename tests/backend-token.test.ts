import { mintBackendToken, toBackendRole, verifyBackendToken } from '@/lib/backend/token'
import type { SessionUser } from '@/lib/session'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const KEY = 'test-signing-key-at-least-32-characters-long'

const session = (role: SessionUser['role'], userId = 'usr_canonical_01'): SessionUser => ({
  userId,
  email: 'adrien@hearstcorporation.io',
  name: 'Adrien',
  role,
})

beforeEach(() => {
  process.env.SESSION_SIGNING_KEY = KEY
})

afterEach(() => {
  delete process.env.SESSION_SIGNING_KEY
})

describe('correspondance des rôles', () => {
  it('OWNER et ADMIN deviennent admin côté backend', () => {
    expect(toBackendRole('OWNER')).toBe('admin')
    expect(toBackendRole('ADMIN')).toBe('admin')
  })

  it('MEMBER n’obtient aucun rôle backend', () => {
    expect(toBackendRole('MEMBER')).toBeNull()
  })
})

describe('frappe du jeton', () => {
  it('produit un jeton vérifiable portant userId, rôle et expiration', () => {
    const minted = mintBackendToken(session('OWNER'))
    expect(minted.ok).toBe(true)
    if (!minted.ok) return

    const payload = verifyBackendToken(minted.token)
    expect(payload?.userId).toBe('usr_canonical_01')
    expect(payload?.role).toBe('admin')
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('n’utilise JAMAIS l’e-mail comme identifiant', () => {
    const minted = mintBackendToken(session('ADMIN'))
    if (!minted.ok) throw new Error('jeton attendu')
    const payload = verifyBackendToken(minted.token)
    expect(payload?.userId).not.toContain('@')
  })

  it('refuse un MEMBER, sans frapper de jeton', () => {
    const minted = mintBackendToken(session('MEMBER'))
    expect(minted.ok).toBe(false)
    if (minted.ok) return
    expect(minted.reason).toBe('forbidden')
  })

  it('refuse une session sans identifiant canonique plutôt que de deviner', () => {
    const minted = mintBackendToken(session('OWNER', ''))
    expect(minted.ok).toBe(false)
    if (minted.ok) return
    expect(minted.reason).toBe('no_canonical_id')
  })

  it('signale une clé de signature absente comme configuration manquante', () => {
    delete process.env.SESSION_SIGNING_KEY
    const minted = mintBackendToken(session('OWNER'))
    expect(minted.ok).toBe(false)
    if (minted.ok) return
    expect(minted.reason).toBe('not_configured')
    expect(minted.detail).toMatch(/SESSION_SIGNING_KEY/)
  })

  it('refuse une clé trop courte', () => {
    process.env.SESSION_SIGNING_KEY = 'trop-court'
    const minted = mintBackendToken(session('OWNER'))
    expect(minted.ok).toBe(false)
  })
})

describe('vérification', () => {
  it('rejette un jeton signé avec une autre clé', () => {
    const minted = mintBackendToken(session('OWNER'))
    if (!minted.ok) throw new Error('jeton attendu')

    process.env.SESSION_SIGNING_KEY = 'une-autre-cle-de-signature-de-32-caracteres'
    expect(verifyBackendToken(minted.token)).toBeNull()
  })

  it('rejette un jeton malformé', () => {
    expect(verifyBackendToken('pas-un-jeton')).toBeNull()
    expect(verifyBackendToken('')).toBeNull()
  })
})
