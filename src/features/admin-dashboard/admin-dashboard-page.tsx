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
       * Deux flux verticaux INDÉPENDANTS, côte à côte via `flex-wrap` :
       *  - MAIN COLUMN   (contenus denses/hauts : exposure, activity, vaults,
       *    recent activity) — `flex: 999 1 44rem`. La base 44rem n'est pas une
       *    largeur d'écran : c'est la largeur minimale où le chart Activity
       *    (min-content mesuré ≈ 43,5rem) reste lisible. Elle grandit goulûment
       *    (grow 999) pour absorber tout l'espace restant.
       *  - SECONDARY RAIL (panneaux courts/statut : rebalancing, market, recent
       *    clients, data health) — `flex: 1 1 18rem`. 18rem = largeur minimale
       *    viable mesurée du panneau le plus contraint (Data health), pas une
       *    largeur fixe : le rail grandit aussi, juste moins vite.
       *
       * Le passage 2 colonnes → 1 colonne ÉMERGE des deux bases : le rail passe
       * sous le main dès que `44rem + 18rem + gap` ne tient plus dans le
       * container. `flex-wrap` ne wrap qu'en rétrécissant et ne déwrap qu'en
       * agrandissant → MONOTONE par construction (pas de seuil qui se
       * redéclenche dans la zone de saut du rail comme le cliff #61). Chaque
       * colonne coule seule : une card courte (Market « Not configured ») finit
       * à sa hauteur, la suivante remonte dessous — aucun trou réservé, aucun
       * gonflage flex-1, aucun cap de largeur, aucun breakpoint nommé.
       */}
      <div className="flex flex-wrap items-start gap-4">
        {/* MAIN COLUMN — flux vertical propre, base = largeur min lisible du chart */}
        <div className="flex min-w-0 flex-[999_1_44rem] flex-col gap-4">
          <DashCard title="Portfolio exposure" subtitle="Where capital is allocated vs target">
            <PortfolioExposurePanel strategies={data.exposure} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Activity" subtitle="Daily volume · 28 days">
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

          <DashCard title="Vaults" subtitle="Capital per vault">
            <VaultsPanel vaults={data.vaults} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Recent activity" subtitle="Blockchain and subscription timeline">
            <ActivityTimelinePanel events={data.recentActivity} assetScale={assetScale} />
          </DashCard>
        </div>

        {/* SECONDARY RAIL — panneaux courts, flux vertical propre, base = min viable */}
        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4">
          <DashCard title="Rebalancing & alerts" subtitle="Drift and indexer">
            <RebalancingAlertsPanel summary={data.rebalancing} />
          </DashCard>

          <DashCard title="Market" subtitle="Normalized snapshot">
            <MarketSnapshotPanel snapshot={data.market} />
          </DashCard>

          <DashCard title="Recent clients" subtitle="Exposure and Som KYC">
            <RecentClientsPanel clients={data.recentClients} assetScale={assetScale} />
          </DashCard>

          <DashCard title="Data health" subtitle="Source freshness">
            <DataHealthGrid sources={data.dataHealth} />
          </DashCard>
        </div>
      </div>
    </DashboardShell>
  )
}
