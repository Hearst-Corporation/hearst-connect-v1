import { ActivityTimelinePanel } from '@/components/admin/dashboard/activity-timeline'
import { MarketSnapshotPanel } from '@/components/admin/dashboard/market-panel'
import { RecentClientsPanel } from '@/components/admin/dashboard/recent-clients-panel'
import { VaultsPanel } from '@/components/admin/dashboard/vaults-panel'
import type {
  AdminActivityEvent,
  AdminMarketSnapshot,
  AdminRecentClient,
  AdminVaultSummary,
} from '@/lib/admin-dashboard/contracts'
import { available, unavailable } from '@/lib/vaults/model'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const SCALE = { asset: 'USDC', decimals: 6 } as const

function eventAt(i: number): AdminActivityEvent {
  return {
    id: `event-${i}`,
    type: 'deposit',
    title: `Event ${i}`,
    clientId: `client-${i}`,
    clientLabel: `Client ${i}`,
    vaultId: `vault-${i}`,
    amountAtomic: '1000000',
    asset: 'USDC',
    txHash: `0x${String(i).padStart(64, '0')}`,
    blockNumber: String(1000 + i),
    occurredAt: '2026-08-09T05:00:00.000Z',
    status: 'indexed',
  }
}

function clientAt(i: number): AdminRecentClient {
  return {
    id: `client-${i}`,
    label: `Client ${i}`,
    createdAt: '2026-08-09T05:00:00.000Z',
    lastActivityAt: null,
    kycProvider: 'som',
    kycStatus: 'verified',
    currentExposureAtomic: '1000000',
    vaultIds: [`vault-${i}`],
  }
}

function vaultAt(i: number): AdminVaultSummary {
  return {
    id: `vault-${i}`,
    label: `Vault ${i}`,
    chainId: 1,
    address: `0x${String(i).padStart(40, '0')}`,
    totalAssetsAtomic: '1000000',
    deployedAtomic: '870000',
    availableAtomic: '130000',
    deployedPct: '87',
    strategiesCount: 3,
    maxDriftBps: 1238,
    lastActivityAt: null,
    status: 'ACTIVE',
  }
}

const MARKET: AdminMarketSnapshot = {
  btcUsd: '65000',
  btcChange24hPct: '1.5',
  hashprice: '80',
  hashpriceChangePct: '-2.5',
  difficulty: null,
  energyCostUsdKwh: '0.08',
  miningMarginScore: 42,
  provider: 'market-feed',
  asOf: '2026-08-09T05:00:00.000Z',
}

describe('dashboard bounded content geometry', () => {
  it('Recent activity keeps the same slot class and windows to 5 rows', () => {
    const empty = render(<ActivityTimelinePanel events={available([])} assetScale={SCALE} />)
    const emptyRoot = empty.container.firstElementChild as HTMLElement
    expect(emptyRoot.className).toContain('dashboard-list-slot-block-size')
    expect(screen.getByText('No recent activity')).toBeTruthy()
    expect(screen.getByText('View all activity')).toBeTruthy()
    empty.unmount()

    const one = render(<ActivityTimelinePanel events={available([eventAt(1)])} assetScale={SCALE} />)
    expect(within(one.container).getAllByRole('listitem')).toHaveLength(1)
    one.unmount()

    const five = render(
      <ActivityTimelinePanel events={available(Array.from({ length: 5 }, (_, i) => eventAt(i + 1)))} assetScale={SCALE} />,
    )
    expect(within(five.container).getAllByRole('listitem')).toHaveLength(5)
    five.unmount()

    const dense = render(
      <ActivityTimelinePanel events={available(Array.from({ length: 50 }, (_, i) => eventAt(i + 1)))} assetScale={SCALE} />,
    )
    const denseRoot = dense.container.firstElementChild as HTMLElement
    expect(denseRoot.className).toBe(emptyRoot.className)
    expect(within(dense.container).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText(/45 older events available in Operations\./)).toBeTruthy()
  })

  it('Recent clients keeps one summary slot across 0, 1, 3 and 20 rows', () => {
    const empty = render(<RecentClientsPanel clients={available([])} assetScale={SCALE} />)
    const emptyRoot = empty.container.firstElementChild as HTMLElement
    expect(emptyRoot.className).toContain('dashboard-list-slot-block-size')
    expect(screen.getByText('No recent clients')).toBeTruthy()
    empty.unmount()

    const one = render(<RecentClientsPanel clients={available([clientAt(1)])} assetScale={SCALE} />)
    expect(within(one.container).getAllByRole('row')).toHaveLength(2)
    one.unmount()

    const three = render(
      <RecentClientsPanel clients={available(Array.from({ length: 3 }, (_, i) => clientAt(i + 1)))} assetScale={SCALE} />,
    )
    expect(within(three.container).getAllByRole('row')).toHaveLength(4)
    three.unmount()

    const dense = render(
      <RecentClientsPanel clients={available(Array.from({ length: 20 }, (_, i) => clientAt(i + 1)))} assetScale={SCALE} />,
    )
    const denseRoot = dense.container.firstElementChild as HTMLElement
    expect(denseRoot.className).toBe(emptyRoot.className)
    expect(within(dense.container).getAllByRole('row')).toHaveLength(4)
    expect(screen.getByText(/17 more clients available in the directory\./)).toBeTruthy()
  })

  it('Vaults keeps one summary slot across 0, 1 and several rows', () => {
    const empty = render(<VaultsPanel vaults={available([])} assetScale={SCALE} />)
    const emptyRoot = empty.container.firstElementChild as HTMLElement
    expect(emptyRoot.className).toContain('dashboard-list-slot-block-size')
    expect(screen.getByText('No vaults reported')).toBeTruthy()
    empty.unmount()

    const one = render(<VaultsPanel vaults={available([vaultAt(1)])} assetScale={SCALE} />)
    expect(within(one.container).getAllByText('Open')).toHaveLength(1)
    one.unmount()

    const many = render(
      <VaultsPanel vaults={available(Array.from({ length: 6 }, (_, i) => vaultAt(i + 1)))} assetScale={SCALE} />,
    )
    const manyRoot = many.container.firstElementChild as HTMLElement
    expect(manyRoot.className).toBe(emptyRoot.className)
    expect(within(many.container).getAllByText('Open')).toHaveLength(4)
    expect(screen.getByText(/2 more vaults available in the registry\./)).toBeTruthy()
  })

  it('Market keeps the same summary slot across unavailable and populated states', () => {
    const unavailableView = render(<MarketSnapshotPanel snapshot={unavailable({ status: 'UNAVAILABLE' })} />)
    const unavailableRoot = unavailableView.container.firstElementChild as HTMLElement
    expect(unavailableRoot.className).toContain('dashboard-summary-slot-block-size')
    unavailableView.unmount()

    const populated = render(<MarketSnapshotPanel snapshot={available(MARKET)} />)
    const populatedRoot = populated.container.firstElementChild as HTMLElement
    expect(populatedRoot.className).toContain('dashboard-summary-slot-block-size')
    expect(screen.getByText('BTC / USD')).toBeTruthy()
  })
})
