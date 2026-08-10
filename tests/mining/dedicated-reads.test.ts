import {
  resolvedFieldLabel,
  reconcileMonthlyBill,
  reconcileHashrate,
} from '@/lib/mining/dedicated-reads'
import { describe, expect, it } from 'vitest'

describe('lectures mining dédiées (F-07)', () => {
  it('signale une concordance de facture mensuelle', () => {
    const bloc = { status: 'LIVE', value: { monthlyCost: '1500000' } }
    expect(reconcileMonthlyBill(bloc, bloc)).toBe('Monthly bill matches.')
  })

  it('signale un écart de facture mensuelle', () => {
    expect(
      reconcileMonthlyBill(
        { status: 'LIVE', value: { monthlyCost: '1500000' } },
        { status: 'LIVE', value: { monthlyCost: '1600000' } },
      ),
    ).toBe('Mismatch between aggregate and dedicated route.')
  })

  it('refuse de comparer quand les deux lectures sont absentes', () => {
    expect(
      reconcileMonthlyBill(
        { status: 'UNAVAILABLE', value: null },
        { status: 'UNAVAILABLE', value: null },
      ),
    ).toBe('No readable monthly bill on either route.')
  })

  it('libelle un statut backend connu', () => {
    expect(resolvedFieldLabel({ status: 'STALE', value: {} })).toBe('stale')
  })
})
