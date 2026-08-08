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
import { HearstActivityChart, type PointActivite } from '@/components/charts'
import { formatCurrency } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import type { AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
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

/**
 * Admin dashboard — portfolio cockpit (HC-ADMIN-DASHBOARD-BACKEND-FIRST-006).
 * Shell layout unchanged; data from backend read models only.
 */
export function AdminDashboardPage({
  data,
  user,
}: Readonly<{ data: AdminDashboardData; user: SessionUser }>) {
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
      value: mapAvailability(data.overview, (o) =>
        formatCurrency(o.totalAumAtomic, { fromAtomic: 10 ** o.decimals }),
      ),
      unit: isAvailable(data.overview) ? data.overview.value.asset : undefined,
      icon: BanknotesIcon,
    },
    {
      id: 'vaults',
      title: 'Vaults',
      value: mapAvailability(data.overview, (o) => String(o.activeVaults)),
      unit: isAvailable(data.overview)
        ? data.overview.value.totalVaults > data.overview.value.activeVaults
          ? `/ ${data.overview.value.totalVaults} total`
          : 'active'
        : undefined,
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
      unit: isAvailable(data.overview)
        ? (data.overview.value.maxDriftStrategyLabel ?? '—')
        : undefined,
      icon: ExclamationTriangleIcon,
    },
  ]

  const activityPoints: PointActivite[] = isAvailable(data.activityTimeseries)
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

      {/*
       * Fluid composition: each row changes structure only when both children
       * have enough real content width. Between thresholds, minmax() tracks
       * absorb every intermediate width instead of hard caps / auto columns.
       */}
      <div className="@container min-w-0">
        <div className="grid grid-cols-1 items-start gap-4 @[52rem]:grid-cols-[minmax(0,1.85fr)_minmax(17rem,1fr)]">
          <DashCard title="Portfolio exposure" subtitle="Where capital is allocated vs target">
            <PortfolioExposurePanel strategies={data.exposure} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Rebalancing & alerts" subtitle="Drift and indexer">
            <RebalancingAlertsPanel summary={data.rebalancing} />
          </DashCard>
        </div>
      </div>

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 items-start gap-4 @[48rem]:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
          <DashCard title="Activity" subtitle="Daily volume · 28 days">
            {showActivityCurve ? (
              <HearstActivityChart points={activityPoints} unite="events" />
            ) : activityNotConfigured ? (
              <div className="flex flex-col gap-1 py-4">
                <p className="text-sm font-semibold text-ink dark:text-fg">Activity index not configured</p>
                <p className="text-xs text-fg-tertiary">
                  {data.activityTimeseries.kind === 'unavailable'
                    ? data.activityTimeseries.reason ?? 'No events indexed yet.'
                    : null}
                </p>
              </div>
            ) : (
              <ChartPlaceholder title="Activity" height={140} icon={ChartBarIcon} />
            )}
          </DashCard>

          <DashCard title="Market" subtitle="Normalized snapshot">
            <MarketSnapshotPanel snapshot={data.market} />
          </DashCard>
        </div>
      </div>

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 items-start gap-4 @[48rem]:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
          <DashCard title="Vaults" subtitle="Capital per vault">
            <VaultsPanel vaults={data.vaults} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Recent clients" subtitle="Exposure and Som KYC">
            <RecentClientsPanel clients={data.recentClients} assetScale={assetScale} />
          </DashCard>
        </div>
      </div>

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 items-start gap-4 @[52rem]:grid-cols-[minmax(0,1.85fr)_minmax(17rem,1fr)]">
          <DashCard title="Recent activity" subtitle="Blockchain and subscription timeline">
            <ActivityTimelinePanel events={data.recentActivity} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Data health" subtitle="Source freshness">
            <DataHealthGrid sources={data.dataHealth} />
          </DashCard>
        </div>
      </div>
    </DashboardShell>
  )
}
