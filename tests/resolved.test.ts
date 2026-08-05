import { formatCount, hasDisplayableValue, resolved } from '@/lib/resolved'
import { describe, expect, it } from 'vitest'

describe('null ne devient jamais 0', () => {
  it('formatCount rend « — » pour null et undefined', () => {
    expect(formatCount(null)).toBe('—')
    expect(formatCount(undefined)).toBe('—')
  })

  it('formatCount rend bien 0 quand le backend a confirmé 0', () => {
    expect(formatCount(0)).toBe('0')
  })

  it('NaN et Infinity ne sont pas affichés comme des mesures', () => {
    expect(formatCount(Number.NaN)).toBe('—')
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('les états sans valeur ne portent aucune donnée', () => {
  it.each(['notConfigured', 'unavailable', 'notSupported', 'permissionDenied', 'error'] as const)(
    '%s expose value=null et n’est pas affichable',
    (kind) => {
      const state = resolved[kind]<number>('raison backend')
      expect(state.value).toBeNull()
      expect(hasDisplayableValue(state)).toBe(false)
    },
  )

  it('un état EMPTY reste distinct d’un zéro', () => {
    const state = resolved.empty<number[]>({ route: '/x' })
    expect(state.status).toBe('EMPTY')
    expect(state.value).toBeNull()
  })
})
