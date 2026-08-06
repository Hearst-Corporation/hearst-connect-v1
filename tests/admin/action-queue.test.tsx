import { ActionQueue } from '@/components/admin/dashboard/action-queue'
import type { PriorityQueueRow } from '@/components/compositions'
import { available, unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * « À traiter » — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Prouve la composition (résumé + panneau d'action + flux) sur données peuplées,
 * et les deux états honnêtes (vide / indisponible) — la zone n'est jamais une
 * grande carte muette, et une absence n'est jamais un « 0 à traiter ».
 */

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
  { id: 'd1', kind: 'transaction', clientLabel: 'Alice Martin', status: 'FAILED', ageLabel: 'il y a 2 h', severity: 'critique', actionHref: '/admin/vaults', actionLabel: 'Voir l’incident' },
  { id: 'd2', kind: 'souscription', clientLabel: 'Bob Durand', status: 'REQUESTED', ageLabel: 'il y a 3 j', severity: 'important', actionHref: '/admin/vaults', actionLabel: 'Reprendre la souscription' },
  { id: 'k1', kind: 'kyc', clientLabel: 'Carla Neri', status: 'revue', ageLabel: 'hier', severity: 'information', actionHref: '/admin/conformite', actionLabel: 'Ouvrir le dossier' },
]

describe('ActionQueue (À traiter)', () => {
  it('renders the composition from real rows: summary + primary action well + compact feed', () => {
    render(<ActionQueue rows={available(ROWS, { provenance: 'db' })} />)
    // A. résumé — total mesuré
    expect(screen.getByText(/à traiter/)).toBeDefined()
    // B. panneau d'action principal = l'item le plus grave (incident) + son action réelle
    expect(screen.getByText('Alice Martin')).toBeDefined()
    const cta = screen.getByRole('link', { name: /Voir l’incident/ })
    expect(cta.getAttribute('href')).toBe('/admin/vaults')
    // C. flux secondaire compact
    expect(screen.getByText('Bob Durand')).toBeDefined()
    expect(screen.getByText('Carla Neri')).toBeDefined()
  })

  it('shows an honest calm empty state (never a fabricated zero) when the queue is empty', () => {
    render(<ActionQueue rows={available([], { provenance: 'db' })} />)
    expect(screen.getByText('Rien à traiter')).toBeDefined()
    expect(screen.queryByText(/à traiter/)?.textContent).not.toMatch(/^0/)
  })

  it('names the absence when the source is unavailable (not an empty list)', () => {
    render(<ActionQueue rows={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(screen.getByText('Données indisponibles')).toBeDefined()
  })

  it('keeps the widget identifiable in every state', () => {
    const { container, rerender } = render(<ActionQueue rows={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(container.querySelector('[data-widget="action-queue"]')).not.toBeNull()
    rerender(<ActionQueue rows={available([], { provenance: 'db' })} />)
    expect(container.querySelector('[data-widget="action-queue"]')).not.toBeNull()
  })
})
