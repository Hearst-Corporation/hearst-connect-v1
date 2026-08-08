import { SubscriptionJourneyStepper } from '@/components/admin/dashboard/subscription-journey'
import type { FunnelStepView } from '@/components/compositions'
import { available, unavailable } from '@/lib/vaults/model'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * SubscriptionJourneyStepper — data-driven journey, not decorative.
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
    label: 'Account created',
    count: available('12', { provenance: 'db' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/clients',
    actionLabel: 'Open clients',
    sourceNote: 'GET /api/v1/clients',
  },
  {
    id: 'kyc',
    label: 'KYC verified',
    count: available('9', { provenance: 'db' }),
    pending: available('4', { provenance: 'db' }),
    actionHref: '/admin/compliance',
    actionLabel: 'Open compliance',
    sourceNote: 'GET /api/v1/compliance',
  },
  {
    id: 'wallet',
    label: 'Active wallet',
    count: available('7', { provenance: 'db' }),
    pending: available('2', { provenance: 'db' }),
    actionHref: '/admin/vaults',
    actionLabel: 'Open vaults',
    sourceNote: 'GET /api/v1/vault — proxy: a wallet is an assigned vault',
  },
  {
    id: 'depot',
    label: 'Deposit confirmed',
    count: available('30', { provenance: 'db' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/operations',
    actionLabel: 'Open operations',
    sourceNote: 'GET /api/v1/series1/events — proxy: no deposit reconciliation',
  },
  {
    id: 'souscription',
    label: 'Subscription signed',
    count: available('5', { provenance: 'db' }),
    pending: available('0', { provenance: 'db' }),
    actionHref: '/admin/vaults',
    actionLabel: 'Open deployments',
    sourceNote: 'GET /api/v1/deployments',
  },
  {
    id: 'position',
    label: 'Active position',
    count: unavailable({ status: 'NOT_EXPOSED' }),
    pending: unavailable({ status: 'NOT_EXPOSED' }),
    actionHref: '/admin/vaults',
    actionLabel: 'View positions',
    sourceNote: 'GET /api/v1/deployments (status=CONFIRMED)',
  },
]

describe('SubscriptionJourneyStepper', () => {
  it('renders the six journey steps as tabs (a real stepper, not comparative bars)', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('derives each step state from real data, never inventing a zero or a check', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    expect(screen.getByText('4 pending')).toBeDefined()
    expect(screen.getByText('2 pending')).toBeDefined()
    expect(screen.getAllByText('Clear').length).toBeGreaterThan(0)
    expect(screen.getByText('Unavailable')).toBeDefined()
  })

  it('opens the first blocking step by default and shows its detail — with no GET /api leak', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    expect(screen.getByText('KYC verified')).toBeDefined()
    expect(screen.queryByText(/GET \/api/)).toBeNull()
  })

  it('switches the detail panel on selection and surfaces the honest proxy caveat only', () => {
    render(<SubscriptionJourneyStepper steps={STEPS} />)
    fireEvent.click(screen.getByRole('tab', { name: /Wallet/ }))
    expect(screen.getByText('Active wallet')).toBeDefined()
    expect(screen.getByText(/proxy/i)).toBeDefined()
    expect(screen.queryByText(/GET \/api\/v1\/vault/)).toBeNull()
  })
})
