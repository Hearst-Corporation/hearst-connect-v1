import { seriesStateFrom, explicationSerie, MOTIF_SERIE } from '@/lib/serie-etat'
import { describe, expect, it } from 'vitest'

describe('serie-etat', () => {
  it('reste sur le défaut quand le motif est absent ou inconnu', () => {
    expect(explicationSerie(undefined, 'default')).toBe('default')
    expect(explicationSerie({ status: 'LIVE', value: 1, reason: '' }, 'default')).toBe('default')
    expect(explicationSerie({ status: 'LIVE', value: 1, reason: 'inconnu' }, 'default')).toBe('default')
  })

  it('traduit les motifs connus', () => {
    expect(explicationSerie({ status: 'UNAVAILABLE', value: null, reason: 'db_error' }, 'x')).toBe(
      MOTIF_SERIE.db_error,
    )
  })

  it('décide l’état du cadre selon le statut backend', () => {
    expect(seriesStateFrom(undefined, 'pending')).toEqual({ type: 'pending', explication: 'pending' })
    expect(seriesStateFrom({ status: 'ERROR', value: null, reason: 'rpc_error' }, 'x')).toEqual({
      type: 'unavailable',
      explication: MOTIF_SERIE.rpc_error,
    })
    expect(seriesStateFrom({ status: 'LIVE', value: null, reason: 'not_available' }, 'x')).toEqual({
      type: 'pending',
      explication: MOTIF_SERIE.not_available,
    })
    expect(seriesStateFrom({ status: 'LIVE', value: { ok: true } }, 'x')).toEqual({ type: 'plotted' })
  })
})
