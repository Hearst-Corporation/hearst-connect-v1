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
import type { AdminDashboardData } from '@/lib/admin-dashboard/load'
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

  return (
    <DashboardShell>
      <DashboardHeader userName={user.name} kpis={kpis} />

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-4 @[56rem]:grid-cols-12">
          <DashCard
            className="@[56rem]:col-span-8"
            title="Portfolio exposure"
            subtitle="Where capital is allocated vs target"
          >
            <PortfolioExposurePanel strategies={data.exposure} />
          </DashCard>

          <DashCard className="@[56rem]:col-span-4" title="Rebalancing & alerts" subtitle="Drift and indexer">
            <RebalancingAlertsPanel summary={data.rebalancing} />
          </DashCard>
        </div>
      </div>

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-4 @[48rem]:grid-cols-12">
          <DashCard
            className="@[48rem]:col-span-7"
            title="Activity"
            subtitle="Daily volume · 28 days"
          >
            {showActivityCurve ? (
              <HearstActivityChart points={activityPoints} unite="events" />
            ) : (
              <ChartPlaceholder title="Activity" height={300} icon={ChartBarIcon} />
            )}
          </DashCard>

          <DashCard className="@[48rem]:col-span-5" title="Market" subtitle="Normalized snapshot">
            <MarketSnapshotPanel snapshot={data.market} />
          </DashCard>
        </div>
      </div>

      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-4 @[48rem]:grid-cols-12">
          <DashCard className="@[48rem]:col-span-7" title="Vaults" subtitle="Capital per vault">
            <VaultsPanel vaults={data.vaults} />
          </DashCard>

          <DashCard className="@[48rem]:col-span-5" title="Recent clients" subtitle="Exposure and Som KYC">
            <RecentClientsPanel clients={data.recentClients} />
          </DashCard>
        </div>
      </div>

      <DashCard title="Recent activity" subtitle="Blockchain and subscription timeline">
        <ActivityTimelinePanel events={data.recentActivity} />
      </DashCard>

      <DashCard title="Data health" subtitle="Source freshness">
        <DataHealthGrid sources={data.dataHealth} />
      </DashCard>
    </DashboardShell>
  )
}
