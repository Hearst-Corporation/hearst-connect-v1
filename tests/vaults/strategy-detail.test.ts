import {
  indexStrategiePrimaire,
  lectureStrategieDetail,
  libelleStrategieDetail,
  statutHttpStrategieDetail,
} from '@/lib/vaults/strategy-detail'
import { isAvailable } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

describe('strategy-detail (F-04)', () => {
  it('choisit l’index 0 quand au moins une stratégie est lisible', () => {
    expect(indexStrategiePrimaire(3)).toBe(0)
    expect(indexStrategiePrimaire(0)).toBeNull()
  })

  it('propage l’indisponibilité du champ strategy', () => {
    const lecture = lectureStrategieDetail(0, {
      ok: true,
      data: { strategy: { status: 'UNAVAILABLE', value: null, reason: 'rpc_error' } },
      meta: null,
      trace: {
        method: 'GET',
        path: '/api/v1/strategies/0',
        httpStatus: 200,
        durationMs: 1,
        requestId: null,
        rateLimitRemaining: null,
        at: '2026-08-05T00:00:00.000Z',
      },
    })
    expect(lecture.kind).toBe('unavailable')
  })

  it('lit un libellé de poche quand la valeur est présente', () => {
    const libelle = libelleStrategieDetail({
      ok: true,
      data: { strategy: { status: 'LIVE', value: { pocket: 'BTC_CORE', label: 'BTC Core' } } },
      meta: null,
      trace: {
        method: 'GET',
        path: '/api/v1/strategies/0',
        httpStatus: 200,
        durationMs: 1,
        requestId: null,
        rateLimitRemaining: null,
        at: '2026-08-05T00:00:00.000Z',
      },
    })
    expect(libelle.kind).toBe('available')
    if (libelle.kind === 'available') expect(libelle.value).toBe('BTC_CORE')
  })

  it('distingue HTTP joignable de champ illisible', () => {
    const http = statutHttpStrategieDetail({
      ok: true,
      data: { strategy: { status: 'UNAVAILABLE', value: null } },
      meta: null,
      trace: {
        method: 'GET',
        path: '/api/v1/strategies/0',
        httpStatus: 200,
        durationMs: 1,
        requestId: null,
        rateLimitRemaining: null,
        at: '2026-08-05T00:00:00.000Z',
      },
    })
    expect(isAvailable(http)).toBe(true)
    if (isAvailable(http)) expect(http.value).toBe('Réponse reçue')
  })
})
