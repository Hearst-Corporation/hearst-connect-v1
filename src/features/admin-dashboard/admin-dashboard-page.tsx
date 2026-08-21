import {
  ActivityTimelinePanel,
  ChartPlaceholder,
  DashCard,
  DashboardHeader,
  DashboardShell,
  DataHealthGrid,
  MarketSnapshotPanel,
  PanelFallback,
  PortfolioExposurePanel,
  RebalancingAlertsPanel,
  RebalancingDriftChart,
  RecentClientsPanel,
  VaultsPanel,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { AllocationDualLineChart, HearstActivityChart, HearstLineChart, type ActivityPoint, type AllocationPoint, type LinePoint } from '@/components/charts'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import {
  loadAdminActivityTimeseries,
  loadAdminAssetScale,
  loadAdminCbbtcAllocation,
  loadAdminDataHealth,
  loadAdminExposure,
  loadAdminMarketSnapshot,
  loadAdminOverview,
  loadAdminRebalancingHistory,
  loadAdminRebalancingSummary,
  loadAdminRecentActivity,
  loadAdminRecentClients,
  loadAdminVaultsSummary,
} from '@/lib/admin-dashboard/load'
import { formatCurrency, formatDriftPts } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import { isAvailable, mapAvailability, type Availability } from '@/lib/vaults/model'
import { Suspense, type ReactNode } from 'react'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/16/solid'

function vaultsKpiUnit(overview: AdminDashboardData['overview']): string | undefined {
  if (!isAvailable(overview)) return undefined
  const { totalVaults, activeVaults } = overview.value
  if (totalVaults > activeVaults) return `/ ${totalVaults} total`
  return 'active'
}

function unavailableReason(bloc: Availability<unknown>, fallback: string): string {
  return bloc.kind === 'unavailable' ? (bloc.reason ?? fallback) : fallback
}

// Order = hierarchy: AUM is the dominant fact (rendered display-large), then
// drift leads the supporting band (pilotage angle: how much, and is it drifting).
function kpisFromOverview(overview: AdminDashboardData['overview']): readonly DashboardKpi[] {
  const deployedAmount = mapAvailability(overview, (o) =>
    formatCurrency(o.deployedAtomic, { fromAtomic: 10 ** o.decimals }),
  )
  return [
    {
      id: 'aum',
      title: 'Total AUM',
      value: mapAvailability(overview, (o) => formatCurrency(o.totalAumAtomic, { fromAtomic: 10 ** o.decimals })),
      unit: isAvailable(overview) ? overview.value.asset : undefined,
      icon: BanknotesIcon,
    },
    {
      id: 'drift',
      title: 'Maximum drift',
      value: mapAvailability(overview, (o) => formatDriftPts(o.maxDriftBps)),
      unit: isAvailable(overview) ? (overview.value.maxDriftStrategyLabel ?? '—') : undefined,
      icon: ExclamationTriangleIcon,
    },
    {
      id: 'vaults',
      title: 'Vaults',
      value: mapAvailability(overview, (o) => String(o.activeVaults)),
      unit: vaultsKpiUnit(overview),
      icon: CubeTransparentIcon,
    },
    {
      id: 'deployed',
      title: 'Deployed capital',
      value: mapAvailability(overview, (o) => `${o.deployedPct}%`),
      unit: isAvailable(deployedAmount) ? deployedAmount.value : undefined,
      icon: ArrowTrendingUpIcon,
    },
  ]
}

function ActivityChartSlot({
  activityTimeseries,
}: Readonly<{
  activityTimeseries: AdminDashboardData['activityTimeseries']
}>) {
  const points: ActivityPoint[] = isAvailable(activityTimeseries)
    ? activityTimeseries.value.map((point) => ({
        label: point.at.slice(5),
        value: point.value,
        detail: point.at,
      }))
    : []

  if (points.length >= 2) {
    return (
      <HearstActivityChart
        points={points}
        unit="events"
        viewport="compact"
      />
    )
  }

  if (isAdminNotConfigured(activityTimeseries)) {
    return (
      <ChartPlaceholder
        title="Activity index not configured"
        detail={unavailableReason(activityTimeseries, 'No events indexed yet.')}
      />
    )
  }

  return <ChartPlaceholder title="Activity" />
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
        viewport="compact"
      />
    )
  }

  if (!isAvailable(cbbtcAllocation)) {
    return (
      <ChartPlaceholder
        title="Data unavailable"
        detail={unavailableReason(cbbtcAllocation, 'Source unavailable')}
      />
    )
  }

  return <ChartPlaceholder title="cbBTC / USDC allocation" />
}

function BtcPriceSlot({
  cbbtcAllocation,
}: Readonly<{
  cbbtcAllocation: AdminDashboardData['cbbtcAllocation']
}>) {
  const points: LinePoint[] = isAvailable(cbbtcAllocation)
    ? cbbtcAllocation.value.map((p) => ({
        label: p.at,
        value: p.btcPriceUsdc,
        detail: p.at,
      }))
    : []

  if (points.length >= 2) {
    return (
      <HearstLineChart
        points={points}
        unit="BTC price (USDC)"
        viewport="compact"
      />
    )
  }

  if (!isAvailable(cbbtcAllocation)) {
    return (
      <ChartPlaceholder
        title="Data unavailable"
        detail={unavailableReason(cbbtcAllocation, 'Source unavailable')}
      />
    )
  }

  return <ChartPlaceholder title="BTC price" />
}

function DashPanel({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle: string; children: ReactNode }>) {
  return (
    <DashCard className="min-w-0" title={title} subtitle={subtitle}>
      {children}
    </DashCard>
  )
}

/* ── Streaming data panels ───────────────────────────────────────────────────
   Each panel awaits its own read model; the React-cache fetchers in
   `lib/admin-dashboard/cache` dedupe shared endpoints across panels, so
   streaming costs no extra backend calls. */

async function HeaderData({ userName }: Readonly<{ userName: string }>) {
  const overview = await loadAdminOverview()
  const kpis = kpisFromOverview(overview)
  return <DashboardHeader userName={userName} kpis={kpis} />
}

async function PortfolioExposureData() {
  const [exposure, assetScale] = await Promise.all([loadAdminExposure(), loadAdminAssetScale()])
  return <PortfolioExposurePanel strategies={exposure} assetScale={assetScale} />
}

async function RebalancingAlertsData() {
  const rebalancing = await loadAdminRebalancingSummary()
  return <RebalancingAlertsPanel summary={rebalancing} />
}

async function ActivityChartData() {
  const activityTimeseries = await loadAdminActivityTimeseries()
  return <ActivityChartSlot activityTimeseries={activityTimeseries} />
}

async function ActivityTimelineData() {
  const [recentActivity, assetScale] = await Promise.all([loadAdminRecentActivity(10), loadAdminAssetScale()])
  return <ActivityTimelinePanel events={recentActivity} assetScale={assetScale} />
}

async function RebalancingHistoryData() {
  const rebalancingHistory = await loadAdminRebalancingHistory()
  return <RebalancingDriftChart rebalancingHistory={rebalancingHistory} />
}

async function VaultsData() {
  const [vaults, assetScale] = await Promise.all([loadAdminVaultsSummary(), loadAdminAssetScale()])
  return <VaultsPanel vaults={vaults} assetScale={assetScale} />
}

async function RecentClientsData() {
  const [clients, assetScale] = await Promise.all([loadAdminRecentClients(5), loadAdminAssetScale()])
  return <RecentClientsPanel clients={clients} assetScale={assetScale} />
}

async function MarketData() {
  const market = await loadAdminMarketSnapshot()
  return <MarketSnapshotPanel snapshot={market} />
}

async function BtcPriceData() {
  const cbbtcAllocation = await loadAdminCbbtcAllocation()
  return <BtcPriceSlot cbbtcAllocation={cbbtcAllocation} />
}

async function AllocationData() {
  const cbbtcAllocation = await loadAdminCbbtcAllocation()
  return <AllocationSlot cbbtcAllocation={cbbtcAllocation} />
}

async function DataHealthData() {
  const dataHealth = await loadAdminDataHealth()
  return <DataHealthGrid sources={dataHealth} />
}

/**
 * Admin dashboard — portfolio cockpit.
 * One bento grid straight under the hero KPIs: no editorial section headers,
 * no vertical chrome — the card titles carry the meaning. Row order is the
 * pilotage hierarchy: exposure + alerts → flow + history → capital → market
 * and sources. Every panel streams independently behind a Suspense boundary.
 */
export function AdminDashboardPage({ user }: Readonly<{ user: SessionUser }>) {
  return (
    <DashboardShell>
      <Suspense fallback={<PanelFallback label="Loading portfolio…" />}>
        <HeaderData userName={user.name} />
      </Suspense>

      {/*
        Cockpit composition — spans are role decisions (dominant 8, flank 4,
        symmetric pair 6, band 12), never derived from today's data volume.
        Below the container threshold every card stacks full-width.
      */}
      <BentoGrid>
        <BentoCard span={8}>
          <DashPanel title="Portfolio exposure" subtitle="Where capital is allocated vs target">
            <Suspense fallback={<PanelFallback />}>
              <PortfolioExposureData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4}>
          <DashPanel title="Rebalancing & alerts" subtitle="Drift and indexer">
            <Suspense fallback={<PanelFallback />}>
              <RebalancingAlertsData />
            </Suspense>
          </DashPanel>
        </BentoCard>

        <BentoCard span={6}>
          <DashPanel title="Activity" subtitle="Daily volume · 28 days">
            <Suspense fallback={<ChartPlaceholder title="Activity" />}>
              <ActivityChartData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={6}>
          <DashPanel title="Recent activity" subtitle="Blockchain and subscription timeline">
            <Suspense fallback={<PanelFallback />}>
              <ActivityTimelineData />
            </Suspense>
          </DashPanel>
        </BentoCard>

        <BentoCard span={12}>
          <DashPanel title="Rebalancing drift" subtitle="Historical allocation drift over time">
            <Suspense fallback={<ChartPlaceholder title="Rebalancing drift" />}>
              <RebalancingHistoryData />
            </Suspense>
          </DashPanel>
        </BentoCard>

        <BentoCard span={8}>
          <DashPanel title="Vaults" subtitle="Capital per vault">
            <Suspense fallback={<PanelFallback />}>
              <VaultsData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4}>
          <DashPanel title="Recent clients" subtitle="Exposure and Som KYC">
            <Suspense fallback={<PanelFallback />}>
              <RecentClientsData />
            </Suspense>
          </DashPanel>
        </BentoCard>

        <BentoCard span={4}>
          <DashPanel title="Market" subtitle="Normalized snapshot">
            <Suspense fallback={<PanelFallback />}>
              <MarketData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4}>
          <DashPanel title="BTC price" subtitle="At primary vault snapshots">
            <Suspense fallback={<ChartPlaceholder title="BTC price" />}>
              <BtcPriceData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4}>
          <DashPanel title="cbBTC / USDC allocation" subtitle="Primary vault — last 28 days">
            <Suspense fallback={<ChartPlaceholder title="cbBTC / USDC allocation" />}>
              <AllocationData />
            </Suspense>
          </DashPanel>
        </BentoCard>

        <BentoCard span={12}>
          <DashPanel title="Data health" subtitle="Source freshness">
            <Suspense fallback={<PanelFallback />}>
              <DataHealthData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
