import { SubscriptionJourneyStepper } from '@/components/admin/dashboard/subscription-journey'
import type { FunnelStepView } from '@/components/compositions'
import { available, unavailable } from '@/lib/vaults/model'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * SubscriptionJourneyStepper — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Prouve que le parcours est PILOTÉ PAR LA DONNÉE, pas décoratif : l'état de
 * chaque étape (`attention` / `clear` / `unavailable`) est dérivé de son
 * `count`/`pending` réel ; une source absente affiche « Indisponible » et « — »,
 * jamais un zéro ni un check fabriqué ; et aucun endpoint `GET /api/…` ne fuit
 * dans l'UI (seule la mise en garde « proxy » est montrée).
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

const STEPS: readonly FunnelStepView[] = [
  {
    id: 'compte',
    label: 'Compte créé',
    count: available('12', { provenance: 'db' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/clients',
    actionLabel: 'Ouvrir les clients',
    sourceNote: 'GET /api/v1/clients',
  },
  {
    id: 'kyc',
    label: 'KYC validé',
    count: available('9', { provenance: 'db' }),
    pending: available('4', { provenance: 'db' }),
    actionHref: '/admin/conformite',
    actionLabel: 'Ouvrir la conformité',
    sourceNote: 'GET /api/v1/compliance',
  },
  {
    id: 'wallet',
    label: 'Wallet actif',
    count: available('7', { provenance: 'db' }),
    pending: available('2', { provenance: 'db' }),
    actionHref: '/admin/vaults',
    actionLabel: 'Ouvrir les coffres',
    sourceNote: 'GET /api/v1/vault — proxy : un wallet est un coffre assigné',
  },
  {
    id: 'depot',
    label: 'Dépôt confirmé',
    count: available('30', { provenance: 'db' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/operations',
    actionLabel: 'Ouvrir les opérations',
    sourceNote: 'GET /api/v1/series1/events — proxy : aucun rapprochement de dépôt',
  },
  {
    id: 'souscription',
    label: 'Souscription signée',
    count: available('5', { provenance: 'db' }),
    pending: available('0', { provenance: 'db' }),
    actionHref: '/admin/vaults',
    actionLabel: 'Ouvrir les déploiements',
    sourceNote: 'GET /api/v1/deployments',
  },
  {
    id: 'position',
    label: 'Position active',
    count: unavailable({ status: 'NOT_EXPOSED' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/vaults',
    actionLabel: 'Voir les positions',
    sourceNote: 'GET /api/v1/deployments (status=CONFIRMED)',
  },
]

describe('SubscriptionJourneyStepper', () => {
  it('renders the six journey steps as tabs (a real stepper, not comparative bars)', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    // aucune barre-mètre comparative
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('derives each step state from real data, never inventing a zero or a check', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    // pending mesuré > 0 → « N en attente »
    expect(screen.getByText('4 en attente')).toBeDefined()
    expect(screen.getByText('2 en attente')).toBeDefined()
    // pending à 0 → « Au clair »
    expect(screen.getAllByText('Au clair').length).toBeGreaterThan(0)
    // source absente → « Indisponible » (jamais un zéro)
    expect(screen.getByText('Indisponible')).toBeDefined()
  })

  it('opens the first blocking step by default and shows its detail — with no GET /api leak', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    // KYC est la première étape « attention » → panneau ouvert par défaut
    expect(screen.getByText('KYC validé')).toBeDefined()
    // aucune fuite d'endpoint technique dans l'UI
    expect(screen.queryByText(/GET \/api/)).toBeNull()
  })

  it('switches the detail panel on selection and surfaces the honest proxy caveat only', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    fireEvent.click(screen.getByRole('tab', { name: /Wallet/ }))
    expect(screen.getByText('Wallet actif')).toBeDefined()
    // la mise en garde proxy est montrée, l'endpoint brut ne l'est pas
    expect(screen.getByText(/un wallet est un coffre assigné/)).toBeDefined()
    expect(screen.queryByText(/GET \/api/)).toBeNull()
  })
})
