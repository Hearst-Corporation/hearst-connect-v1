import { runtimeMatrixStatus, runtimeStatusLabel } from '@/lib/backend/runtime'
import { describe, expect, it } from 'vitest'

describe('runtimeMatrixStatus', () => {
  it('traite STALLED comme indisponible, pas partiel', () => {
    expect(runtimeMatrixStatus('STALLED')).toBe('UNAVAILABLE')
    expect(runtimeMatrixStatus('stalled')).toBe('UNAVAILABLE')
  })

  it('conserve les états sains connus', () => {
    expect(runtimeMatrixStatus('running')).toBe('LIVE')
    expect(runtimeMatrixStatus('CONFIGURED')).toBe('LIVE')
  })

  it('tombe sur PARTIAL pour les valeurs inconnues non critiques', () => {
    expect(runtimeMatrixStatus('degraded')).toBe('PARTIAL')
  })
})

describe('runtimeStatusLabel', () => {
  it('libelle STALLED sans le masquer', () => {
    expect(runtimeStatusLabel('STALLED')).toBe('Bloqué')
    expect(runtimeStatusLabel('stalled')).toBe('Bloqué')
  })
})
