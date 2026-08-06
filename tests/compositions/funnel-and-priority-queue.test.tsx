import { FunnelPipeline, PriorityQueue, type FunnelStepView, type PriorityQueueRow } from '@/components/compositions'
import { available, unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Contracts for the pilotage cockpit's two new compositions
 * (HC-ADMIN-DASHBOARD-PILOTAGE-001). Same guarantee as every other
 * composition in this file: an absence renders as a NAMED absence, never a
 * silent zero or a blank space that reads as a bug.
 */

function step(overrides: Partial<FunnelStepView> = {}): FunnelStepView {
  return {
    id: 'kyc',
    label: 'KYC validé',
    count: available('4'),
    pending: available('1'),
    actionHref: '/admin/conformite',
    actionLabel: 'Ouvrir la conformité',
    sourceNote: 'GET /api/v1/compliance',
    ...overrides,
  }
}

describe('FunnelPipeline', () => {
  it('renders every step it is given, in order, never dropping one', () => {
    const steps = [
      step({ id: 'compte', label: 'Compte créé' }),
      step({ id: 'kyc', label: 'KYC validé' }),
      step({ id: 'wallet', label: 'Wallet actif' }),
    ]
    render(<FunnelPipeline steps={steps} />)
    expect(screen.getByText('Compte créé')).toBeTruthy()
    expect(screen.getByText('KYC validé')).toBeTruthy()
    expect(screen.getByText('Wallet actif')).toBeTruthy()
  })

  it('names an unavailable step count instead of showing a zero', () => {
    const steps = [step({ count: unavailable({ endpoint: '/api/v1/clients', status: 'UNAVAILABLE' }) })]
    render(<FunnelPipeline steps={steps} />)
    expect(screen.queryByText('0')).toBeNull()
  })

  it('surfaces a pending badge only when the step actually has one', () => {
    render(<FunnelPipeline steps={[step({ pending: available('3') })]} />)
    expect(screen.getByText('3 en attente')).toBeTruthy()
  })

  it('links every step to its resolving route', () => {
    render(<FunnelPipeline steps={[step({ actionHref: '/admin/conformite', actionLabel: 'Ouvrir la conformité' })]} />)
    const link = screen.getByRole('link', { name: 'Ouvrir la conformité' })
    expect(link.getAttribute('href')).toBe('/admin/conformite')
  })
})

function row(overrides: Partial<PriorityQueueRow> = {}): PriorityQueueRow {
  return {
    id: 'kyc-1',
    kind: 'kyc',
    clientLabel: 'Jean Dupont',
    status: 'a-verifier',
    ageLabel: 'il y a 3 j',
    severity: 'important',
    actionHref: '/admin/conformite',
    actionLabel: 'Ouvrir le dossier',
    ...overrides,
  }
}

describe('PriorityQueue', () => {
  it('renders the expected-source state when the queue itself is unavailable', () => {
    render(
      <PriorityQueue
        rows={unavailable({ endpoint: '/api/v1/compliance', status: 'UNAVAILABLE' })}
        source={{ quoi: 'Actions prioritaires', detail: 'Absente', requis: ['GET /api/v1/compliance'] }}
      />,
    )
    expect(screen.getByText('Actions prioritaires')).toBeTruthy()
  })

  it('renders a calm state, not an empty void, when the queue is genuinely empty', () => {
    render(
      <PriorityQueue
        rows={available([])}
        source={{ quoi: 'Actions prioritaires', detail: 'x', requis: [] }}
      />,
    )
    expect(screen.getByText(/Aucune action prioritaire/)).toBeTruthy()
  })

  it('renders every row with its client, status and action', () => {
    render(
      <PriorityQueue
        rows={available([row()])}
        source={{ quoi: 'x', detail: 'x', requis: [] }}
      />,
    )
    expect(screen.getByText('Jean Dupont')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ouvrir le dossier' })).toBeTruthy()
  })

  it('caps visible rows at maxRows and offers a link to the rest', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row({ id: `kyc-${i}`, clientLabel: `Client ${i}` }))
    render(
      <PriorityQueue
        rows={available(rows)}
        source={{ quoi: 'x', detail: 'x', requis: [] }}
        maxRows={5}
        seeAllHref="/admin/conformite"
      />,
    )
    expect(screen.getAllByText(/^Client \d$/).length).toBe(5)
    expect(screen.getByText(/Voir les 5 élément/)).toBeTruthy()
  })
})
