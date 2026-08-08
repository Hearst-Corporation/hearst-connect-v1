import { ActionQueue } from '@/components/admin/dashboard/action-queue'
import type { PriorityQueueRow } from '@/components/compositions'
import { available, unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }
})

const ROWS: readonly PriorityQueueRow[] = [
  { id: 'd1', kind: 'transaction', clientLabel: 'Alice Martin', status: 'FAILED', ageLabel: '2 hr ago', severity: 'critique', actionHref: '/admin/vaults', actionLabel: 'View incident' },
  { id: 'd2', kind: 'souscription', clientLabel: 'Bob Durand', status: 'REQUESTED', ageLabel: '3 d ago', severity: 'important', actionHref: '/admin/vaults', actionLabel: 'Resume subscription' },
  { id: 'k1', kind: 'kyc', clientLabel: 'Carla Neri', status: 'revue', ageLabel: 'yesterday', severity: 'information', actionHref: '/admin/compliance', actionLabel: 'Open file' },
]

describe('ActionQueue (To process)', () => {
  it('renders the composition from real rows: summary + primary action well + compact feed', () => {
    render(<ActionQueue rows={available(ROWS, { provenance: 'db' })} />)
    expect(screen.getByText(/to process/)).toBeDefined()
    expect(screen.getByText('Alice Martin')).toBeDefined()
    const cta = screen.getByRole('link', { name: /View incident/ })
    expect(cta.getAttribute('href')).toBe('/admin/vaults')
    expect(screen.getByText('Bob Durand')).toBeDefined()
    expect(screen.getByText('Carla Neri')).toBeDefined()
  })

  it('shows an honest calm empty state (never a fabricated zero) when the queue is empty', () => {
    render(<ActionQueue rows={available([], { provenance: 'db' })} />)
    expect(screen.getByText('Nothing to process')).toBeDefined()
    expect(screen.queryByText(/to process/)?.textContent).not.toMatch(/^0/)
  })

  it('names the absence when the source is unavailable (not an empty list)', () => {
    render(<ActionQueue rows={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(screen.getByText('Data unavailable')).toBeDefined()
  })

  it('keeps the widget identifiable in every state', () => {
    const { container, rerender } = render(<ActionQueue rows={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(container.querySelector('[data-widget="action-queue"]')).not.toBeNull()
    rerender(<ActionQueue rows={available([], { provenance: 'db' })} />)
    expect(container.querySelector('[data-widget="action-queue"]')).not.toBeNull()
  })
})
