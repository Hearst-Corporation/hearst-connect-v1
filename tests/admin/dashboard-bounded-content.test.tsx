import { ActivityTimelinePanel } from '@/components/admin/dashboard/activity-timeline'
import { MarketSnapshotPanel } from '@/components/admin/dashboard/market-panel'
import { PortfolioExposurePanel } from '@/components/admin/dashboard/portfolio-exposure'
import { RecentClientsPanel } from '@/components/admin/dashboard/recent-clients-panel'
import { VaultsPanel } from '@/components/admin/dashboard/vaults-panel'
import type {
  AdminActivityEvent,
  AdminExposureStrategy,
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

const EXPOSURE_ROW: AdminExposureStrategy = {
  strategyId: 's1',
  strategyLabel: 'Strategy 1',
  vaultId: 'vault-1',
  targetBps: 5000,
  actualBps: 6200,
  driftBps: 1200,
  exposureAtomic: '1000000',
  status: 'out_of_target',
}

describe('dashboard panel content', () => {
  it('Portfolio exposure renders empty and populated states', () => {
    const empty = render(<PortfolioExposurePanel strategies={available([])} assetScale={SCALE} />)
    expect(screen.getByText('No strategies measured')).toBeTruthy()
    empty.unmount()

    render(<PortfolioExposurePanel strategies={available([EXPOSURE_ROW])} assetScale={SCALE} />)
    expect(screen.getAllByText('Strategy 1').length).toBeGreaterThanOrEqual(1)
  })

  it('Recent activity lists all events from the read model', () => {
    const empty = render(<ActivityTimelinePanel events={available([])} assetScale={SCALE} />)
    expect(screen.getByText('No recent activity')).toBeTruthy()
    expect(screen.getByText('View all activity')).toBeTruthy()
    empty.unmount()

    const dense = render(
      <ActivityTimelinePanel events={available(Array.from({ length: 8 }, (_, i) => eventAt(i + 1)))} assetScale={SCALE} />,
    )
    expect(within(dense.container).getAllByRole('listitem')).toHaveLength(8)
    dense.unmount()
  })

  it('Recent clients lists all rows from the read model', () => {
    const empty = render(<RecentClientsPanel clients={available([])} assetScale={SCALE} />)
    expect(screen.getByText('No recent clients')).toBeTruthy()
    empty.unmount()

    const populated = render(
      <RecentClientsPanel clients={available(Array.from({ length: 5 }, (_, i) => clientAt(i + 1)))} assetScale={SCALE} />,
    )
    expect(within(populated.container).getAllByRole('row')).toHaveLength(6)
    populated.unmount()
  })

  it('Vaults lists all summary rows from the read model', () => {
    const empty = render(<VaultsPanel vaults={available([])} assetScale={SCALE} />)
    expect(screen.getByText('No vaults reported')).toBeTruthy()
    empty.unmount()

    const populated = render(
      <VaultsPanel vaults={available(Array.from({ length: 6 }, (_, i) => vaultAt(i + 1)))} assetScale={SCALE} />,
    )
    expect(within(populated.container).getAllByText('Open')).toHaveLength(6)
    populated.unmount()
  })

  it('Market renders unavailable and populated states', () => {
    const unavailableView = render(<MarketSnapshotPanel snapshot={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(screen.getByText('Data unavailable')).toBeTruthy()
    unavailableView.unmount()

    render(<MarketSnapshotPanel snapshot={available(MARKET)} />)
    expect(screen.getByText('BTC / USD')).toBeTruthy()
  })
})
