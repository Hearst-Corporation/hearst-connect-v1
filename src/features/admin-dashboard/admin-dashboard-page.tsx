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
import { PendingStrip } from '@/features/admin-approvals/pending-strip'
import {
  loadAdminApprovals,
  loadAdminBtcReserve,
  loadAdminOffers,
  loadAdminProductionCost,
  loadAdminVaultRegistry,
} from '@/lib/admin-dashboard/load'
import type { AdminBtcReserve, AdminDashboardData } from '@/lib/admin-dashboard/contracts'
import type { ProductionCost } from '@/lib/product/readings'
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
import { formatCurrency, formatDriftPts, formatNumber } from '@/lib/format'
import { isAvailable, mapAvailability, type Availability } from '@/lib/vaults/model'
import { Suspense, type ReactNode } from 'react'
import { PipelineStrip } from './pipeline-strip'
import { VaultWatchlist } from './vault-watchlist'
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
/** Décisions en attente, chargées à part : le bandeau ne bloque pas le reste. */
async function PendingDecisions() {
  const [approvals, vaults] = await Promise.all([loadAdminApprovals(), loadAdminVaultRegistry()])
  return <PendingStrip approvals={approvals} vaults={vaults} />
}

/**
 * Les trois chiffres de tête.
 *
 * L'en-tête portait AUM, dérive maximale, nombre de vaults et capital déployé
 * — quatre mesures de structure, dont deux (la dérive d'une poche, le
 * pourcentage déployé) ne disent rien de l'activité du jour et se lisent mieux
 * vault par vault, plus bas.
 *
 * À la place : ce que le produit gère, ce qu'il a produit, et à quel prix.
 * Le troisième est le cœur de la thèse — on acquiert du bitcoin sous le cours,
 * et c'est cet écart qui fait le produit.
 */
function dashboardKpis(
  overview: AdminDashboardData['overview'],
  reserve: Availability<AdminBtcReserve>,
  cost: Availability<ProductionCost>,
): readonly DashboardKpi[] {
  return [
    {
      id: 'aum',
      title: 'Capital under management',
      value: mapAvailability(overview, (o) =>
        formatCurrency(o.totalAumAtomic, { fromAtomic: 10 ** o.decimals }),
      ),
      unit: isAvailable(overview) ? overview.value.asset : undefined,
      icon: BanknotesIcon,
    },
    {
      id: 'produced',
      title: 'Bitcoin produced',
      value: mapAvailability(reserve, (r) =>
        r.producedSats === null
          ? '—'
          : formatNumber(r.producedSats / 1e8, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
      ),
      unit: 'BTC since inception',
      icon: CubeTransparentIcon,
    },
    {
      id: 'cost',
      title: 'Cost to mine one BTC',
      value: mapAvailability(cost, (c) =>
        formatCurrency(String(Math.round(c.costPerBtcUsd)), { unit: '$', fromAtomic: 1 }),
      ),
      /* L'écart au marché EN UNITÉ : c'est la marge du produit, la raison pour
         laquelle miner vaut mieux qu'acheter. Le cours seul ne la dit pas. */
      unit: isAvailable(cost)
        ? `vs ${formatCurrency(String(Math.round(cost.value.marketPriceUsd)), { unit: '$', fromAtomic: 1 })} market`
        : undefined,
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

  return <ChartPlaceholder title="Activity" detail="No activity series indexed yet." />
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
  subtitle,
  action,
  slot,
  children,
}: Readonly<{
  title: string
  /* Chaque bloc porte une phrase qui dit CE QU'IL MONTRE, comme sur /account
     (« Mining Economics » / « What producing one BTC costs »). Un titre seul
     nomme un sujet sans dire ce qu'on en lit. */
  subtitle?: string
  action?: ReactNode
  slot?: PanelSlot
  children: ReactNode
}>) {
  return (
    <DashCard
      className="min-w-0"
      contentClassName={slot === undefined ? undefined : PANEL_SLOT_CLASS[slot]}
      title={title}
      subtitle={subtitle}
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
  const [overview, reserve, cost] = await Promise.all([
    loadAdminOverview(),
    loadAdminBtcReserve(),
    loadAdminProductionCost(),
  ])
  return (
    <DashboardHeader
      kpis={dashboardKpis(overview, reserve, cost)}
      action={
        <HearstPrimaryAction icon={<PlusIcon />} href="/admin/offers/new">
          New offer
        </HearstPrimaryAction>
      }
    />
  )
}

async function PortfolioExposureData() {
  const [exposure, assetScale] = await Promise.all([loadAdminExposure(), loadAdminAssetScale()])
  return <PortfolioExposurePanel strategies={exposure} assetScale={assetScale} />
}

async function PipelineData() {
  const offers = await loadAdminOffers()
  return <PipelineStrip offers={offers} />
}

async function VaultWatchlistData() {
  const vaults = await loadAdminVaultRegistry()
  return <VaultWatchlist vaults={vaults} />
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
      {/* Ce qui ATTEND une décision passe avant les lectures de marché : un
          tableau de bord qui n'annonce pas ce qui bloque laisse l'opérateur
          découvrir les demandes par hasard. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel
            title="Waiting on you"
            subtitle="Deposits, distributions and withdrawals that need a decision"
          >
            <Suspense fallback={<PanelFallback />}>
              <PendingDecisions />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* Market strip — one thin band of readings. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel title="Market" subtitle="Bitcoin price, hashprice and network difficulty">
            <Suspense fallback={<PanelFallback />}>
              <MarketData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LE PIPELINE ────────────────────────────────────────────────────
          Avant toute mesure de ce qui tourne déjà : l'essentiel d'une journée
          est en amont — des offres à finir, à relancer, des fonds à appeler,
          des vaults à ouvrir. Rien de cela n'était visible ici. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel
            title="Pipeline"
            subtitle="Where each prospect stands, and what is waiting on you"
            action={<PanelHeaderLink href="/admin/offers">Open offers</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <PipelineData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LES VAULTS, UN PAR LIGNE ───────────────────────────────────────
          Remplace « Strategy exposure across all vaults ». Ce donut agrégeait
          des mandats sur mesure en une moyenne pondérée : le code le
          reconnaissait lui-même — « pas un mix que quiconque détiendrait ».
          Or on ne rééquilibre jamais « le portefeuille », on rééquilibre le
          vault de quelqu'un, contre SON seuil. */}
      <BentoGrid>
        <BentoCard span={8} bare>
          <DashPanel
            title="Vaults"
            subtitle="One vault per client, each against its own drift threshold"
            action={<PanelHeaderLink href="/admin/vaults">All vaults</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <VaultWatchlistData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashPanel
            title="Recent activity"
            subtitle="The latest movements across all vaults"
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
        <BentoCard span={6} bare>
          <DashPanel
            title="Rebalancing drift"
            subtitle="How far each vault has moved from target, over 90 days"
            action={<PanelHeaderLink href="/admin/operations">Open operations</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback label="Rebalancing drift" />}>
              <RebalancingHistoryData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={6} bare>
          <DashPanel title="Activity" subtitle="On-chain events per day">
            <Suspense fallback={<PanelFallback label="Activity" />}>
              <ActivityChartData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

    </DashboardShell>
  )
}
