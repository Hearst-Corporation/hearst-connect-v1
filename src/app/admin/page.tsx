import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import {
  DashboardBarChart,
  DashboardCapitalDonut,
  DashboardProgressRadial,
  DashboardTrendChart,
} from '@/components/admin/dashboard-visuals'
import { AdminSurface } from '@/components/admin/surfaces'
import { AdminLabel, AdminPage, AdminSurfaceTitle, adminTypography } from '@/components/admin/typography'
import { ClientExceptionTable } from '@/components/vaults/client-exception-table'
import { DeploymentQueue } from '@/components/vaults/deployment-queue'
import { MovementLedger } from '@/components/vaults/movement-ledger'
import { RebalancingQueue } from '@/components/vaults/rebalancing-queue'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { VaultValueBreakdown } from '@/components/vaults/vault-value-breakdown'
import { requireSession } from '@/lib/auth'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { estateOverview, MOVEMENT_ROWS, MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import clsx from 'clsx'

/**
 * Administration overview — the control surface of the console.
 *
 * ── What this page is, and what it stopped being ──────────────────────────
 * It used to be an investor-facing portfolio report: a hero figure for
 * portfolio assets, an allocation chart, a pockets list, subscription and
 * minimum-ticket tiles, a shortcut row. That is a description of ONE product
 * to the person who bought it. An administrator does not open the console to
 * read the product's performance; they open it to find out what needs a
 * decision — which vaults exist, which clients are stuck, what is queued, and
 * what has drifted.
 *
 * So the page is now the operating model in one screen, read top to bottom:
 *   1. the four headline figures that describe the estate;
 *   2. the vaults themselves, and where their value sits;
 *   3. what is queued — allocation drift, then deployments;
 *   4. what is blocked — client exceptions — beside what actually happened.
 *
 * Allocation is deliberately shown ONCE, in the rebalancing queue. The old
 * page plotted it three times (target-vs-actual bars, a drift chart, a pockets
 * list) and none of the three was a decision. The vault detail page owns the
 * pocket-by-pocket reading.
 *
 * ── Why so much of it reads "Unavailable" ─────────────────────────────────
 * The service exposes one vault, its strategies and its ledger. There is no
 * client directory, no deployment ledger and no compliance endpoint — those
 * routes answer 404, and `rebalancing/status` answers with its own reason.
 * Every figure here is therefore an `Availability`: a reading, or a named
 * absence carrying the route that would answer it. There is no third state,
 * and in particular a count nobody can make is never rendered as zero.
 */

// Next.js does not apply a layout's title.template to a page sharing the same
// route segment as that layout (only to nested descendants) — so the admin
// index composes its title explicitly rather than relying on admin/layout.tsx.
export const metadata: Metadata = { title: { absolute: 'Administration overview · Hearst Connect' } }
export const dynamic = 'force-dynamic'


/* ── The KPI strip ────────────────────────────────────────────────────────── */

type OverviewKpi = Readonly<{
  id: string
  label: string
  value: Availability<string>
}>

/**
 * One figure of the strip.
 *
 * The two states are rendered by two different mechanisms on purpose. A
 * reading is a large tabular number; an absence is the word "Unavailable" with
 * the route that would answer it, in the same badge every table on this
 * console uses. Neither can be mistaken for the other, and neither can be
 * mistaken for a zero.
 */
function KpiTile({ kpi }: Readonly<{ kpi: OverviewKpi }>) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl bg-white/95 px-3 py-1.5 ring-1 ring-zinc-950/8 dark:bg-white/3 dark:ring-white/6">
      <AdminLabel>{kpi.label}</AdminLabel>
      <p className="mt-1 flex min-h-6 items-center">
        {isAvailable(kpi.value) ? (
          <span className={clsx(adminTypography.numericStandard, 'text-[1rem]/6 wrap-break-word')}>{kpi.value.value}</span>
        ) : (
          <SourceAvailabilityBadge availability={kpi.value} compact />
        )}
      </p>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const session = await requireSession()
  // ONE read for the whole page. Every surface below is a view onto the same
  // registry, so two cards can never disagree about the same vault.
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const vaults = registry.vaults
  // Every figure below comes from ONE derivation of the registry, shared with
  // the green command center laboratory — the two surfaces cannot disagree.
  const overview = estateOverview(registry)
  const {
    totalValueLocked,
    deployedCapital,
    availableCapital,
    deploymentRatioBps: deploymentRatioRaw,
    deploymentRatio,
    recentMovements,
    recentTrend,
    movementBars: movementVisual,
  } = overview

  const kpis: readonly OverviewKpi[] = [
    { id: 'vaults-active', label: 'Active vaults', value: overview.activeVaults },
    { id: 'rebalance', label: 'Above threshold', value: overview.breachedPockets },
    { id: 'movements', label: 'Recent movements', value: recentMovements },
    { id: 'sources', label: 'Live sources', value: overview.liveSources },
  ]
  return (
    <AdminPage className="space-y-5">
      <PageHeader title="Home" compact />

      <div className="space-y-5">
        <AdminMetricGrid count={kpis.length} className="gap-3">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
          ))}
        </AdminMetricGrid>

        <AdminGrid className="items-stretch gap-4">
          <AdminCol span={7}>
            <AdminSurface className="h-full">
              <div className="flex flex-wrap items-start justify-between gap-4 px-4 pt-4 sm:px-5">
                <div className="min-w-0">
                  <AdminLabel>Estate value</AdminLabel>
                  <div className="mt-1.5 flex min-h-10 items-center">
                    {isAvailable(totalValueLocked) ? (
                      <span className={clsx(adminTypography.numericHero, 'text-[1.25rem]/6 sm:text-[1.5rem]/7')}>
                        {totalValueLocked.value}
                      </span>
                    ) : (
                      <SourceAvailabilityBadge availability={totalValueLocked} />
                    )}
                  </div>
                </div>
                <SourceAvailabilityBadge availability={registry.movements} compact />
              </div>
              <div className="px-4 pt-3 pb-4 sm:px-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <AdminSurfaceTitle className="text-sm/5">Recent activity</AdminSurfaceTitle>
                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {isAvailable(recentMovements) ? recentMovements.value : 'Unavailable'}
                  </span>
                </div>
                <DashboardTrendChart points={isAvailable(recentTrend) ? recentTrend.value : []} availability={recentTrend} />
              </div>
            </AdminSurface>
          </AdminCol>

          <AdminCol span={5}>
            <AdminSurface className="h-full">
              <div className="px-4 pt-4 sm:px-5">
                <AdminSurfaceTitle className="text-sm/5">Capital</AdminSurfaceTitle>
              </div>
              <div className="grid h-full grid-cols-1 items-center gap-3 px-4 pt-3 pb-4 sm:grid-cols-2 sm:px-5">
                <DashboardCapitalDonut
                  deployedBps={isAvailable(deploymentRatioRaw) ? deploymentRatioRaw.value : null}
                  deployedLabel={isAvailable(deployedCapital) ? deployedCapital.value : null}
                  idleLabel={isAvailable(availableCapital) ? availableCapital.value : null}
                  availability={deploymentRatioRaw}
                />
                <DashboardProgressRadial
                  ratioBps={isAvailable(deploymentRatioRaw) ? deploymentRatioRaw.value : null}
                  ratioLabel={isAvailable(deploymentRatio) ? deploymentRatio.value : null}
                  availability={deploymentRatioRaw}
                />
              </div>
            </AdminSurface>
          </AdminCol>
        </AdminGrid>

        <AdminGrid className="items-stretch gap-4">
          <AdminCol span={6}>
            <AdminSurface className="h-full">
              <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
                <AdminSurfaceTitle className="text-sm/5">Movement types</AdminSurfaceTitle>
                <SourceAvailabilityBadge availability={registry.movements} compact />
              </div>
              <div className="px-4 pt-2 pb-4 sm:px-5">
                <DashboardBarChart bars={movementVisual} availability={registry.movements} />
              </div>
            </AdminSurface>
          </AdminCol>

          <AdminCol span={6}>
            <VaultValueBreakdown vaults={vaults} />
          </AdminCol>
        </AdminGrid>

        <AdminGrid className="items-stretch gap-4">
          <AdminCol span={6}>
            <ClientExceptionTable exceptions={registry.clientExceptions} />
          </AdminCol>
          <AdminCol span={6}>
            <DeploymentQueue deployments={registry.deployments} vaults={vaults} />
          </AdminCol>
        </AdminGrid>

        <RebalancingQueue rows={registry.rebalancing} />

        <MovementLedger movements={registry.movements} vaults={vaults} limit={MOVEMENT_ROWS} />
      </div>
    </AdminPage>
  )
}
