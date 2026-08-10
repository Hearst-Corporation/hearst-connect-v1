import {
  ActivityTimelinePanel,
  ChartPlaceholder,
  DashCard,
  DashboardHeader,
  DashboardShell,
  DataHealthGrid,
  MarketSnapshotPanel,
  PortfolioExposurePanel,
  RebalancingAlertsPanel,
  RecentClientsPanel,
  VaultsPanel,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { AllocationDualLineChart, HearstActivityChart, HearstLineChart, type ActivityPoint, type AllocationPoint, type LinePoint } from '@/components/charts'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import { isAvailable, mapAvailability } from '@/lib/vaults/model'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/16/solid'

function driftPtsLabel(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

function vaultsKpiUnit(data: AdminDashboardData): string | undefined {
  if (!isAvailable(data.overview)) return undefined
  const { totalVaults, activeVaults } = data.overview.value
  if (totalVaults > activeVaults) return `/ ${totalVaults} total`
  return 'active'
}

function ActivityChartSlot({
  showActivityCurve,
  activityNotConfigured,
  activityPoints,
  activityTimeseries,
}: Readonly<{
  showActivityCurve: boolean
  activityNotConfigured: boolean
  activityPoints: ActivityPoint[]
  activityTimeseries: AdminDashboardData['activityTimeseries']
}>) {
  if (showActivityCurve) {
    return (
      <HearstActivityChart
        points={activityPoints}
        unit="events"
        height={176}
      />
    )
  }

  if (activityNotConfigured) {
    const reason =
      activityTimeseries.kind === 'unavailable'
        ? (activityTimeseries.reason ?? 'No events indexed yet.')
        : null
    return (
      <div className="flex h-full min-h-[11rem] flex-col justify-center gap-1 rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft">
        <p className="text-ink dark:text-fg text-sm font-semibold">Activity index not configured</p>
        <p className="text-fg-tertiary text-xs">{reason}</p>
      </div>
    )
  }

  return <ChartPlaceholder title="Activity" height={176} icon={ChartBarIcon} />
}

function AllocationSlot({
  cbbtcAllocation,
}: Readonly<{
  cbbtcAllocation: AdminDashboardData['cbbtcAllocation']
}>) {
  const points: AllocationPoint[] = isAvailable(cbbtcAllocation)
    ? cbbtcAllocation.value.map((p) => ({
        label: p.at,
        cbbtcPct: p.cbbtcPct,
        usdcPct: p.usdcPct,
        detail: p.at,
      }))
    : []

  if (points.length >= 2) {
    return (
      <AllocationDualLineChart
        points={points}
        height={176}
      />
    )
  }

  if (!isAvailable(cbbtcAllocation)) {
    const reason =
      cbbtcAllocation.kind === 'unavailable'
        ? (cbbtcAllocation.reason ?? 'Source unavailable')
        : 'Source unavailable'
    return (
      <div className="flex h-full min-h-[11rem] flex-col justify-center gap-1 rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft">
        <p className="text-ink dark:text-fg text-sm font-semibold">Data unavailable</p>
        <p className="text-fg-tertiary text-xs">{reason}</p>
      </div>
    )
  }

  return <ChartPlaceholder title="cbBTC / USDC allocation" height={176} icon={ChartBarIcon} />
}

function RebalancingHistorySlot({
  rebalancingHistory,
}: Readonly<{
  rebalancingHistory: AdminDashboardData['rebalancingHistory']
}>) {
  const points: LinePoint[] = isAvailable(rebalancingHistory)
    ? rebalancingHistory.value.map((p) => ({
        label: p.observedAt.slice(0, 10),
        value: p.driftBps,
        detail: p.observedAt,
      }))
    : []

  if (points.length >= 2) {
    return (
      <HearstLineChart
        points={points}
        unit="drift (bps)"
        height={176}
      />
    )
  }

  if (isAdminNotConfigured(rebalancingHistory)) {
    const reason =
      rebalancingHistory.kind === 'unavailable'
        ? (rebalancingHistory.reason ?? 'No rebalancing history indexed yet.')
        : null
    return (
      <div className="flex h-full min-h-[11rem] flex-col justify-center gap-1 rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft">
        <p className="text-ink dark:text-fg text-sm font-semibold">Rebalancing history not configured</p>
        <p className="text-fg-tertiary text-xs">{reason}</p>
      </div>
    )
  }

  if (!isAvailable(rebalancingHistory)) {
    const reason =
      rebalancingHistory.kind === 'unavailable'
        ? (rebalancingHistory.reason ?? 'Source unavailable')
        : 'Source unavailable'
    return (
      <div className="flex h-full min-h-[11rem] flex-col justify-center gap-1 rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft">
        <p className="text-ink dark:text-fg text-sm font-semibold">Data unavailable</p>
        <p className="text-fg-tertiary text-xs">{reason}</p>
      </div>
    )
  }

  return <ChartPlaceholder title="Rebalancing drift" height={176} icon={ChartBarIcon} />
}

/**
 * Admin dashboard — portfolio cockpit (HC-ADMIN-DASHBOARD-BACKEND-FIRST-006).
 * Shell layout unchanged; data from backend read models only.
 */
export function AdminDashboardPage({ data, user }: Readonly<{ data: AdminDashboardData; user: SessionUser }>) {
  const assetScale: AdminAssetScale | null = isAvailable(data.overview)
    ? { asset: data.overview.value.asset, decimals: data.overview.value.decimals }
    : null

  const deployedAmount = mapAvailability(data.overview, (o) =>
    formatCurrency(o.deployedAtomic, { fromAtomic: 10 ** o.decimals }),
  )

  const kpis: readonly DashboardKpi[] = [
    {
      id: 'aum',
      title: 'Total AUM',
      value: mapAvailability(data.overview, (o) => formatCurrency(o.totalAumAtomic, { fromAtomic: 10 ** o.decimals })),
      unit: isAvailable(data.overview) ? data.overview.value.asset : undefined,
      icon: BanknotesIcon,
    },
    {
      id: 'vaults',
      title: 'Vaults',
      value: mapAvailability(data.overview, (o) => String(o.activeVaults)),
      unit: vaultsKpiUnit(data),
      icon: CubeTransparentIcon,
    },
    {
      id: 'deployed',
      title: 'Deployed capital',
      value: mapAvailability(data.overview, (o) => `${o.deployedPct}%`),
      unit: isAvailable(deployedAmount) ? deployedAmount.value : undefined,
      icon: ArrowTrendingUpIcon,
    },
    {
      id: 'drift',
      title: 'Maximum drift',
      value: mapAvailability(data.overview, (o) => driftPtsLabel(o.maxDriftBps)),
      unit: isAvailable(data.overview) ? (data.overview.value.maxDriftStrategyLabel ?? '—') : undefined,
      icon: ExclamationTriangleIcon,
    },
  ]

  const activityPoints: ActivityPoint[] = isAvailable(data.activityTimeseries)
    ? data.activityTimeseries.value.map((point) => ({
        label: point.at.slice(5),
        value: point.value,
        detail: point.at,
      }))
    : []
  const showActivityCurve = activityPoints.length >= 2
  const activityNotConfigured = isAdminNotConfigured(data.activityTimeseries)

  return (
    <DashboardShell>
      <DashboardHeader userName={user.name} kpis={kpis} />

      <BentoGrid>
        {/*
         * Masonry flow: cards drop into the shortest column, top to bottom. The
         * order below is chosen so the two tallest panels (Portfolio exposure,
         * Recent activity) don't both land in the same column — no size prop is
         * involved, only sequence.
         */}
        <BentoCard>
          <DashCard
            className="min-w-0"
            title="Portfolio exposure"
            subtitle="Where capital is allocated vs target"
          >
            <PortfolioExposurePanel strategies={data.exposure} assetScale={assetScale} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard
            className="min-w-0"
            contentClassName="flex-1"
            title="Activity"
            subtitle="Daily volume · 28 days"
          >
            <ActivityChartSlot
              showActivityCurve={showActivityCurve}
              activityNotConfigured={activityNotConfigured}
              activityPoints={activityPoints}
              activityTimeseries={data.activityTimeseries}
            />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard
            className="min-w-0"
            title="Recent activity"
            subtitle="Blockchain and subscription timeline"
          >
            <ActivityTimelinePanel events={data.recentActivity} assetScale={assetScale} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard
            className="min-w-0"
            title="Rebalancing & alerts"
            subtitle="Drift and indexer"
          >
            <RebalancingAlertsPanel summary={data.rebalancing} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard
            className="min-w-0"
            contentClassName="flex-1"
            title="Rebalancing drift"
            subtitle="Historical allocation drift over time"
          >
            <RebalancingHistorySlot rebalancingHistory={data.rebalancingHistory} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard className="min-w-0" title="Vaults" subtitle="Capital per vault">
            <VaultsPanel vaults={data.vaults} assetScale={assetScale} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard className="min-w-0" title="Data health" subtitle="Source freshness">
            <DataHealthGrid sources={data.dataHealth} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard className="min-w-0" title="Market" subtitle="Normalized snapshot">
            <MarketSnapshotPanel snapshot={data.market} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard
            className="min-w-0"
            contentClassName="flex-1"
            title="cbBTC / USDC allocation"
            subtitle="Primary vault — last 28 days"
          >
            <AllocationSlot cbbtcAllocation={data.cbbtcAllocation} />
          </DashCard>
        </BentoCard>

        <BentoCard>
          <DashCard className="min-w-0" title="Recent clients" subtitle="Exposure and Som KYC">
            <RecentClientsPanel clients={data.recentClients} assetScale={assetScale} />
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
