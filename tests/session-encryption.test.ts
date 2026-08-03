import { createToken, verifyToken, type Session } from '@/lib/session'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * SEC-02 regression: the session cookie is authenticated-ENCRYPTED, not merely
 * signed. The backend bearer token must not be recoverable from the token value
 * by anyone without the key, and any tampering must be rejected.
 */

const session: Session = {
  userId: 'usr_1',
  email: 'adrien@hearstcorporation.io',
  name: 'adrien',
  role: 'OWNER',
  backendToken: 'BACKEND-BEARER-TOKEN-DO-NOT-LEAK',
  expiresAt: Math.floor(Date.now() / 1000) + 600,
}

beforeEach(() => {
  process.env.AUTH_SECRET = 'x'.repeat(48)
})

describe('SEC-02 — session payload is encrypted, not readable', () => {
  it('the backend token does NOT appear in cleartext in the cookie value', () => {
    const token = createToken(session)
    // Neither raw, nor base64url-decoding any segment, reveals the token.
    expect(token).not.toContain(session.backendToken)
    const decodedSegments = token
      .split('.')
      .map((part) => {
        try {
          return Buffer.from(part, 'base64url').toString('utf8')
        } catch {
          return ''
        }
      })
      .join(' ')
    expect(decodedSegments).not.toContain(session.backendToken)
  })

  it('is a versioned v1 token with four segments', () => {
    const token = createToken(session)
    const parts = token.split('.')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v1')
  })

  it('round-trips: the server recovers the exact session', () => {
    const token = createToken(session)
    expect(verifyToken(token)).toEqual(session)
  })

  it('two tokens for the same session differ (fresh IV each time)', () => {
    expect(createToken(session)).not.toBe(createToken(session))
  })

  it('a tampered ciphertext is rejected by the GCM tag', () => {
    const token = createToken(session)
    const parts = token.split('.')
    const ct = Buffer.from(parts[2], 'base64url')
    ct[0] ^= 1
    parts[2] = ct.toString('base64url')
    expect(verifyToken(parts.join('.'))).toBeNull()
  })

  it('a token sealed under another secret does not verify', () => {
    const token = createToken(session)
    process.env.AUTH_SECRET = 'y'.repeat(48)
    expect(verifyToken(token)).toBeNull()
  })

  it('a malformed or truncated token is rejected', () => {
    expect(verifyToken('garbage')).toBeNull()
    expect(verifyToken('v1.only.three')).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
  })
})
