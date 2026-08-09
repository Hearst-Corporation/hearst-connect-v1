import {
  ActivityTimelinePanel,
  DASHBOARD_CHART_SLOT_CLASS,
  DASHBOARD_CHART_SLOT_HEIGHT,
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
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { HearstActivityChart, type PointActivite } from '@/components/charts'
import type { AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatCurrency } from '@/lib/format'
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
      unit: isAvailable(data.overview) ? (data.overview.value.maxDriftStrategyLabel ?? '—') : undefined,
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
       * Dashboard deterministic regions — one AdminGrid row per band.
       * Spans 7+5 / 6+3+3 / 4+4+4 share the same 12-column tracks so vertical
       * edges align across rows. Card shells stay intrinsic; only content slots
       * inside widgets stay stable between data states.
       *
       * Medium spans: never put three `md={4}` in one band — on the 8-column
       * ladder that yields 4+4 then a stranded half-row. Tertiary columns keep
       * the default md=8 (stack) until the 12-column ladder; secondary side
       * panels may share an 8-column row as a deliberate 4+4 pair after the
       * timeline stacks.
       *
       * Primary band: stretch shells so Exposure + Activity share one baseline
       * (no page hole under the shorter chart card). Chart viewport stays 11rem.
       */}
      <div className="flex flex-col gap-4">
        <AdminGrid align="stretch">
          <AdminCol span={7}>
            <DashCard
              className="h-full min-w-0"
              title="Portfolio exposure"
              subtitle="Where capital is allocated vs target"
            >
              <PortfolioExposurePanel strategies={data.exposure} assetScale={assetScale} />
            </DashCard>
          </AdminCol>

          <AdminCol span={5}>
            <DashCard
              className="h-full min-w-0"
              contentClassName="flex-1"
              title="Activity"
              subtitle="Daily volume · 28 days"
            >
              {showActivityCurve ? (
                <HearstActivityChart
                  points={activityPoints}
                  unite="events"
                  height={DASHBOARD_CHART_SLOT_HEIGHT}
                />
              ) : activityNotConfigured ? (
                <div
                  className={`flex h-full min-h-0 flex-col justify-center gap-1 rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft ${DASHBOARD_CHART_SLOT_CLASS}`}
                >
                  <p className="text-ink dark:text-fg text-sm font-semibold">Activity index not configured</p>
                  <p className="text-fg-tertiary text-xs">
                    {data.activityTimeseries.kind === 'unavailable'
                      ? (data.activityTimeseries.reason ?? 'No events indexed yet.')
                      : null}
                  </p>
                </div>
              ) : (
                <ChartPlaceholder title="Activity" dashboardSlot icon={ChartBarIcon} />
              )}
            </DashCard>
          </AdminCol>
        </AdminGrid>

        <AdminGrid>
          <AdminCol span={6}>
            <DashCard
              className="min-w-0"
              title="Recent activity"
              subtitle="Blockchain and subscription timeline"
            >
              <ActivityTimelinePanel events={data.recentActivity} assetScale={assetScale} />
            </DashCard>
          </AdminCol>

          <AdminCol span={3} md={4}>
            <DashCard
              className="min-w-0"
              title="Rebalancing & alerts"
              subtitle="Drift and indexer"
            >
              <RebalancingAlertsPanel summary={data.rebalancing} />
            </DashCard>
          </AdminCol>

          <AdminCol span={3} md={4}>
            <DashCard className="min-w-0" title="Vaults" subtitle="Capital per vault">
              <VaultsPanel vaults={data.vaults} assetScale={assetScale} />
            </DashCard>
          </AdminCol>
        </AdminGrid>

        <AdminGrid>
          <AdminCol span={4}>
            <DashCard className="min-w-0" title="Data health" subtitle="Source freshness">
              <DataHealthGrid sources={data.dataHealth} />
            </DashCard>
          </AdminCol>

          <AdminCol span={4}>
            <DashCard className="min-w-0" title="Market" subtitle="Normalized snapshot">
              <MarketSnapshotPanel snapshot={data.market} />
            </DashCard>
          </AdminCol>

          <AdminCol span={4}>
            <DashCard className="min-w-0" title="Recent clients" subtitle="Exposure and Som KYC">
              <RecentClientsPanel clients={data.recentClients} assetScale={assetScale} />
            </DashCard>
          </AdminCol>
        </AdminGrid>
      </div>
    </DashboardShell>
  )
}
