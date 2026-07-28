import { etatSerieDe, explicationSerie, MOTIF_SERIE } from '@/lib/serie-etat'
import { describe, expect, it } from 'vitest'

describe('serie-etat', () => {
  it('reste sur le défaut quand le motif est absent ou inconnu', () => {
    expect(explicationSerie(undefined, 'défaut')).toBe('défaut')
    expect(explicationSerie({ status: 'LIVE', value: 1, reason: '' }, 'défaut')).toBe('défaut')
    expect(explicationSerie({ status: 'LIVE', value: 1, reason: 'inconnu' }, 'défaut')).toBe('défaut')
  })

  it('traduit les motifs connus', () => {
    expect(explicationSerie({ status: 'UNAVAILABLE', value: null, reason: 'db_error' }, 'x')).toBe(
      MOTIF_SERIE.db_error,
    )
  })

  it('décide l’état du cadre selon le statut backend', () => {
    expect(etatSerieDe(undefined, 'attente')).toEqual({ type: 'attendue', explication: 'attente' })
    expect(etatSerieDe({ status: 'ERROR', value: null, reason: 'rpc_error' }, 'x')).toEqual({
      type: 'indisponible',
      explication: MOTIF_SERIE.rpc_error,
    })
    expect(etatSerieDe({ status: 'LIVE', value: null, reason: 'not_available' }, 'x')).toEqual({
      type: 'attendue',
      explication: MOTIF_SERIE.not_available,
    })
    expect(etatSerieDe({ status: 'LIVE', value: { ok: true } }, 'x')).toEqual({ type: 'tracee' })
  })
})
