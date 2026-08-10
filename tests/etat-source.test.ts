import { readableSourceState } from '@/lib/movements'
import { describe, expect, it } from 'vitest'

/**
 * Non-régression de la présentation des états de source (revue visuelle du
 * 2026-08-04).
 *
 * ── Le défaut ─────────────────────────────────────────────────────────────
 * Cinq pages rendaient `source.status.toLowerCase()` dans le panneau
 * « Activité des sources ». Relevé sur la capture desktop de /admin/vaults :
 * cinq lignes « unavailable » et une « live », en anglais, dans une console
 * française. Sur /admin/backtest, le même code brut arrivait dans une carte de
 * 134 px et s'y cassait en « NOT_CONFIGURE / D ».
 *
 * ── Ce que ces tests protègent ────────────────────────────────────────────
 * La séparation entre le code TECHNIQUE — qui circule, vient du backend et ne
 * change pas — et sa PRÉSENTATION, qui est du texte d'interface et se traduit.
 * Confondre les deux, c'est soit laisser fuir de l'anglais à l'écran, soit
 * renommer une valeur de contrat.
 */

describe('readableSourceState', () => {
  it('traduit les états que le service émet réellement', () => {
    expect(readableSourceState('LIVE')).toBe('live')
    expect(readableSourceState('UNAVAILABLE')).toBe('unavailable')
    expect(readableSourceState('NOT_EXPOSED')).toBe('not exposed')
    expect(readableSourceState('NOT_CONFIGURED')).toBe('not configured')
    expect(readableSourceState('PARTIAL')).toBe('partial')
    expect(readableSourceState('EMPTY')).toBe('no data')
  })

  it('renders known states without leaking raw uppercase codes', () => {
    const connus = [
      'LIVE',
      'EMPTY',
      'PARTIAL',
      'NOT_EXPOSED',
      'NOT_CONFIGURED',
      'NOT_SUPPORTED',
      'PERMISSION_DENIED',
      'STALE',
      'SIMULATED',
      'ERROR',
      'UNAVAILABLE',
    ]
    for (const etat of connus) {
      const rendu = readableSourceState(etat)
      expect(rendu).not.toMatch(/[A-Z_]{4,}/)
    }
  })

  it('un état inconnu se rend tel quel plutôt que requalifié', () => {
    /*
     * Volontaire, et c'est le point délicat : un code que ce dictionnaire ne
     * connaît pas ne doit PAS retomber sur « indisponible ». Un état inconnu
     * n'est pas une absence — le requalifier affirmerait quelque chose que le
     * service n'a pas dit. Un code brut visible est un défaut d'affichage ;
     * un état inventé est un mensonge.
     */
    expect(readableSourceState('QUELQUE_CHOSE_DE_NOUVEAU')).toBe('quelque_chose_de_nouveau')
  })

  it('une absence d’état rend un tiret, jamais une phrase inventée', () => {
    expect(readableSourceState(null)).toBe('—')
    expect(readableSourceState(undefined)).toBe('—')
    expect(readableSourceState('')).toBe('—')
  })
})
