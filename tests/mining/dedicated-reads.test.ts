import {
  etiquetteChampResolu,
  reconcilierFactureMensuelle,
  reconcilierHashrate,
} from '@/lib/mining/dedicated-reads'
import { describe, expect, it } from 'vitest'

describe('lectures mining dédiées (F-07)', () => {
  it('signale une concordance de facture mensuelle', () => {
    const bloc = { status: 'LIVE', value: { monthlyCost: '1500000' } }
    expect(reconcilierFactureMensuelle(bloc, bloc)).toBe('Concordance sur la facture mensuelle.')
  })

  it('signale un écart de facture mensuelle', () => {
    expect(
      reconcilierFactureMensuelle(
        { status: 'LIVE', value: { monthlyCost: '1500000' } },
        { status: 'LIVE', value: { monthlyCost: '1600000' } },
      ),
    ).toBe('Écart signalé entre l’agrégat et la route dédiée.')
  })

  it('refuse de comparer quand les deux lectures sont absentes', () => {
    expect(
      reconcilierFactureMensuelle(
        { status: 'UNAVAILABLE', value: null },
        { status: 'UNAVAILABLE', value: null },
      ),
    ).toBe('Aucune facture mensuelle lisible sur les deux routes.')
  })

  it('libelle un statut backend connu', () => {
    expect(etiquetteChampResolu({ status: 'STALE', value: {} })).toBe('obsolète')
  })
})
