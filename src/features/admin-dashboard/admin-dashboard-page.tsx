import {
  ActivityTimelinePanel,
  ChartPlaceholder,
  DashCard,
  DashboardHeader,
  DashboardShell,
  MarketSnapshotPanel,
  PanelFallback,
  PanelHeaderLink,
  PortfolioExposurePanel,
  RebalancingAlertsPanel,
  RebalancingDriftChart,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { HearstPrimaryAction } from '@/components/actions'
import { HearstActivityChart, type ActivityPoint } from '@/components/charts'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import {
  loadAdminActivityTimeseries,
  loadAdminExposure,
  loadAdminMarketSnapshot,
  loadAdminOverview,
  loadAdminRebalancingHistory,
  loadAdminRebalancingSummary,
  loadAdminRecentActivity,
  loadAdminAssetScale,
} from '@/lib/admin-dashboard/load'
import { formatCurrency, formatDriftPts } from '@/lib/format'
import { isAvailable, mapAvailability, type Availability } from '@/lib/vaults/model'
import { Suspense, type ReactNode } from 'react'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  PlusIcon,
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

// Order = hierarchy: AUM is the dominant fact, then drift (pilotage angle:
// how much, and is it drifting).
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

/**
 * Fixed panel slots (content area, px) — the box is FROZEN whether data is
 * loading, absent, or plotted; taller content scrolls inside the box. The
 * values are row-matched: [exposure + alerts] + gap == timeline card, so
 * row A's two columns end on the same line at any data state.
 *   exposure 304 + alerts 188 + gap 24 + 3×header 76 == timeline 592 + 76.
 */
const PANEL_SLOT_CLASS = {
  exposure: 'h-[304px] overflow-y-auto scrollbar-none',
  signal: 'h-[188px] overflow-y-auto scrollbar-none',
  timeline: 'h-[592px] overflow-hidden',
} as const

type PanelSlot = keyof typeof PANEL_SLOT_CLASS

function DashPanel({
  title,
  action,
  slot,
  children,
}: Readonly<{
  title: string
  action?: ReactNode
  slot?: PanelSlot
  children: ReactNode
}>) {
  return (
    <DashCard
      className="min-w-0"
      contentClassName={slot === undefined ? undefined : PANEL_SLOT_CLASS[slot]}
      title={title}
      action={action}
    >
      {children}
    </DashCard>
  )
}

/* ── Streaming data panels ───────────────────────────────────────────────────
   Each panel awaits its own read model; the React-cache fetchers in
   `lib/admin-dashboard/cache` dedupe shared endpoints across panels, so
   streaming costs no extra backend calls. */

async function HeaderData() {
  const overview = await loadAdminOverview()
  const kpis = kpisFromOverview(overview)
  return (
    <DashboardHeader
      kpis={kpis}
      action={
        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Client creation is not available on the backend"
        >
          Add client
        </HearstPrimaryAction>
      }
    />
  )
}

async function PortfolioExposureData() {
  const [exposure, assetScale] = await Promise.all([loadAdminExposure(), loadAdminAssetScale()])
  return <PortfolioExposurePanel strategies={exposure} assetScale={assetScale} />
}

async function RebalancingAlertsData() {
  const rebalancing = await loadAdminRebalancingSummary()
  return <RebalancingAlertsPanel summary={rebalancing} />
}

async function MarketData() {
  const market = await loadAdminMarketSnapshot()
  return <MarketSnapshotPanel snapshot={market} />
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

/**
 * Admin dashboard — the cockpit FIRST SCREEN.
 *
 * Only what counts at a glance: KPI strip → exposure + signal rail → drift
 * trend → flow. No pages of scroll, no secondary charts — BTC price and
 * cbBTC/USDC allocation live on the vault page, clients on /admin/clients,
 * source health on /admin/runtime, capital detail on /admin/vaults.
 *
 * Explicit rows, each owning its grid; every panel streams independently
 * behind a Suspense boundary.
 */
export function AdminDashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<PanelFallback label="Loading portfolio…" />}>
        <HeaderData />
      </Suspense>

      {/*
        Rows whose heights MATCH by construction — measured settled heights:
        [exposure + alerts] ≈ the capped timeline; two compact charts are equal;
        the market strip is one thin band. No frozen slots, no voids, nothing
        stretches. Links live on the card title row, not in a footer strip.
      */}
      {/* Market strip first — one thin band of readings at the top. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashPanel title="Market">
            <Suspense fallback={<PanelFallback />}>
              <MarketData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* Row A — pilotage + latest events rail. */}
      <BentoGrid>
        <BentoCard span={8}>
          <div className="flex min-w-0 flex-col gap-6">
            <DashPanel title="Portfolio exposure" slot="exposure">
              <Suspense fallback={<PanelFallback />}>
                <PortfolioExposureData />
              </Suspense>
            </DashPanel>
            <DashPanel
              title="Rebalancing & alerts"
              slot="signal"
              action={<PanelHeaderLink href="/admin/operations">Open operations</PanelHeaderLink>}
            >
              <Suspense fallback={<PanelFallback />}>
                <RebalancingAlertsData />
              </Suspense>
            </DashPanel>
          </div>
        </BentoCard>
        <BentoCard span={4}>
          <DashPanel
            title="Recent activity"
            slot="timeline"
            action={<PanelHeaderLink href="/admin/operations">View all activity</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <ActivityTimelineData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* Row B — the chart pair: equal viewports, equal heights. */}
      <BentoGrid>
        <BentoCard span={6}>
          <DashPanel title="Rebalancing drift">
            <Suspense fallback={<ChartPlaceholder title="Rebalancing drift" />}>
              <RebalancingHistoryData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={6}>
          <DashPanel title="Activity">
            <Suspense fallback={<ChartPlaceholder title="Activity" />}>
              <ActivityChartData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

    </DashboardShell>
  )
}
