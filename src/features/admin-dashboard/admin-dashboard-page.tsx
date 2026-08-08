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
       * Composition INTRINSÈQUE (HC-ADMIN-TRUE-FLUID-RESPONSIVE). Aucune
       * dimension d'écran ne pilote ce layout : il répond seulement à « combien
       * de place ai-je réellement maintenant ? ».
       *
       * BENTO INTRINSÈQUE — la taille de chaque tuile suit le POIDS de sa donnée,
       * pas une dimension d'écran. `flex-wrap` de tuiles dont la `flex-basis`
       * traduit la richesse mesurée du panneau (hauteur de contenu réelle) :
       *  - tuiles LARGES (basis min(100%,30rem), grow 4) pour les données denses/étalées :
       *    Portfolio exposure, Activity (le chart a besoin de largeur), Recent
       *    activity — elles réclament ~2 unités et absorbent l'espace.
       *  - tuiles MOYENNES (basis min(100%,18rem), grow 2) : Rebalancing, Vaults, Data
       *    health.
       *  - tuiles PETITES (basis min(100%,15rem), grow 1) : Market, Recent clients — souvent
       *    peu/pas de données ; elles restent COMPACTES et se rangent côte à côte
       *    au lieu de créer une grosse box vide. Aucune détection `sparse` : c'est
       *    la base intrinsèque qui les garde petites, et leur hauteur = leur
       *    contenu réel (une tuile vide finit courte, la voisine se cale à côté).
       *
       * Le nombre de colonnes du bento ÉMERGE des bases : `flex-wrap` ne wrap
       * qu'en rétrécissant → MONOTONE par construction (pas de seuil dans la zone
       * de saut du rail [680,975], donc pas de cliff #61). Aucun cap de largeur,
       * aucun `flex-1` de remplissage, aucun breakpoint nommé. Les tuiles
       * `items-start` gardent chacune leur hauteur naturelle.
       */}
      <div className="flex flex-wrap items-start gap-4">
        {/* LARGE — données denses/étalées (poids fort) */}
        <DashCard
          className="min-w-0 flex-[4_1_min(100%,30rem)]"
          title="Portfolio exposure"
          subtitle="Where capital is allocated vs target"
        >
          <PortfolioExposurePanel strategies={data.exposure} assetScale={assetScale} />
        </DashCard>

        <DashCard className="min-w-0 flex-[4_1_min(100%,30rem)]" title="Activity" subtitle="Daily volume · 28 days">
          {showActivityCurve ? (
            <HearstActivityChart points={activityPoints} unite="events" />
          ) : activityNotConfigured ? (
            <div className="flex flex-col gap-1 py-4">
              <p className="text-ink dark:text-fg text-sm font-semibold">Activity index not configured</p>
              <p className="text-fg-tertiary text-xs">
                {data.activityTimeseries.kind === 'unavailable'
                  ? (data.activityTimeseries.reason ?? 'No events indexed yet.')
                  : null}
              </p>
            </div>
          ) : (
            <ChartPlaceholder title="Activity" height={140} icon={ChartBarIcon} />
          )}
        </DashCard>

        <DashCard
          className="min-w-0 flex-[4_1_min(100%,30rem)]"
          title="Recent activity"
          subtitle="Blockchain and subscription timeline"
        >
          <ActivityTimelinePanel events={data.recentActivity} assetScale={assetScale} />
        </DashCard>

        {/* MOYEN — données de taille intermédiaire (poids moyen) */}
        <DashCard className="min-w-0 flex-[2_1_min(100%,18rem)]" title="Rebalancing & alerts" subtitle="Drift and indexer">
          <RebalancingAlertsPanel summary={data.rebalancing} />
        </DashCard>

        <DashCard className="min-w-0 flex-[2_1_min(100%,18rem)]" title="Vaults" subtitle="Capital per vault">
          <VaultsPanel vaults={data.vaults} assetScale={assetScale} />
        </DashCard>

        <DashCard className="min-w-0 flex-[2_1_min(100%,18rem)]" title="Data health" subtitle="Source freshness">
          <DataHealthGrid sources={data.dataHealth} />
        </DashCard>

        {/* PETIT — données courtes/souvent sparse (poids faible) : reste compact */}
        <DashCard className="min-w-0 flex-[1_1_min(100%,15rem)]" title="Market" subtitle="Normalized snapshot">
          <MarketSnapshotPanel snapshot={data.market} />
        </DashCard>

        <DashCard className="min-w-0 flex-[1_1_min(100%,15rem)]" title="Recent clients" subtitle="Exposure and Som KYC">
          <RecentClientsPanel clients={data.recentClients} assetScale={assetScale} />
        </DashCard>
      </div>
    </DashboardShell>
  )
}
