import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import {
  DashboardBarChart,
  DashboardCapitalDonut,
  DashboardProgressRadial,
  DashboardTrendChart,
  type DashboardBarPoint,
  type DashboardTrendPoint,
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
import { formatCurrency, formatNumber } from '@/lib/format'
import { libelleMouvement } from '@/lib/mouvements'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  available,
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  mapAvailability,
  unavailable,
  type Availability,
  type Movement,
  type Vault,
} from '@/lib/vaults/model'
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

/** The overview reads a short ledger window; the operations log owns the long one. */
const MOVEMENT_WINDOW = 12
const MOVEMENT_ROWS = 8

const ZERO = BigInt(0)
const BPS = BigInt(10000)

/* ── Totals across the estate ─────────────────────────────────────────────── */

/**
 * The denomination every money figure on the strip is expressed in.
 *
 * Atomic units cannot be turned into money without knowing their decimals: the
 * same integer is $1.18M at six decimals and $1.18 at twelve. And a total
 * across vaults only means something if they share one denomination — adding
 * USDC to a different asset would produce a number in no currency at all.
 */
function denomination(vaults: Availability<readonly Vault[]>): Availability<{ symbol: string; decimals: number }> {
  if (!isAvailable(vaults)) return vaults
  let found: { symbol: string; decimals: number } | null = null
  for (const vault of vaults.value) {
    if (!isAvailable(vault.asset)) return vault.asset
    if (found === null) {
      found = vault.asset.value
      continue
    }
    if (found.symbol !== vault.asset.value.symbol || found.decimals !== vault.asset.value.decimals) {
      return unavailable({ status: 'PARTIAL', reason: 'vaults_use_different_denominations' })
    }
  }
  if (found === null) return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_to_total' })
  return available(found, { provenance: 'chain', asOf: vaults.asOf })
}

/**
 * Sums one atomic reading over every vault, or reports why the total cannot be
 * stated.
 *
 * A single unreadable vault makes the TOTAL unreadable. Summing the others
 * would publish a figure that is smaller than the truth and looks exactly like
 * a complete one — the most expensive kind of wrong number, because nothing on
 * screen would betray it.
 *
 * An empty register is an absence too: a sum over nothing is arithmetically
 * zero but is not a measurement of anything.
 */
function sumAcrossVaults(
  vaults: Availability<readonly Vault[]>,
  read: (vault: Vault) => Availability<bigint>,
): Availability<bigint> {
  if (!isAvailable(vaults)) return vaults
  if (vaults.value.length === 0) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_to_total' })
  }
  let total = ZERO
  for (const vault of vaults.value) {
    const part = read(vault)
    if (!isAvailable(part)) return part
    total += part.value
  }
  return available(total, { provenance: vaults.provenance, asOf: vaults.asOf, stale: vaults.stale })
}

/** An atomic total, rendered as money only once its denomination is known too. */
function asMoney(
  total: Availability<bigint>,
  asset: Availability<{ symbol: string; decimals: number }>,
): Availability<string> {
  return combine(total, asset, (raw, denom) =>
    formatCurrency(raw.toString(), { decimals: 0, fromAtomic: 10 ** denom.decimals }),
  )
}

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

function movementTypeBars(movements: Availability<readonly { eventName: string }[]>): readonly DashboardBarPoint[] {
  if (!isAvailable(movements)) return []
  const counts = new Map<string, number>()
  for (const movement of movements.value) {
    const label = libelleMouvement(movement.eventName)
    const previous = counts.get(label)
    counts.set(label, previous === undefined ? 1 : previous + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function recentActivityTrend(
  movements: Availability<readonly Movement[]>,
  asset: Availability<{ symbol: string; decimals: number }>,
): Availability<readonly DashboardTrendPoint[]> {
  if (!isAvailable(movements)) return movements

  const moneyPoints =
    isAvailable(asset)
      ? movements.value
          .filter((movement) => movement.occurredAt !== null && movement.assetAmountAtomic !== null)
          .slice()
          .sort((a, b) => Date.parse(a.occurredAt ?? '') - Date.parse(b.occurredAt ?? ''))
          .slice(-8)
          .map((movement) => {
            const raw = Number(movement.assetAmountAtomic)
            if (!Number.isFinite(raw)) return null
            const occurredAt = movement.occurredAt as string
            return {
              label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(occurredAt)),
              value: raw / 10 ** asset.value.decimals,
              detail: new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(occurredAt)),
            }
          })
          .filter((point): point is DashboardTrendPoint => point !== null)
      : []

  if (moneyPoints.length >= 2) {
    return available(moneyPoints, {
      provenance: movements.provenance,
      asOf: movements.asOf,
      stale: movements.stale,
    })
  }

  const buckets = new Map<string, { order: number; label: string; value: number; detail: string }>()
  for (const movement of movements.value) {
    if (movement.occurredAt === null) continue
    const timestamp = Date.parse(movement.occurredAt)
    if (Number.isNaN(timestamp)) continue
    const bucket = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
    const current = buckets.get(bucket)
    if (current === undefined) {
      buckets.set(bucket, {
        order: timestamp,
        label: bucket,
        value: 1,
        detail: bucket,
      })
      continue
    }
    current.value += 1
  }

  const countPoints = [...buckets.values()].sort((a, b) => a.order - b.order)
  if (countPoints.length >= 2) {
    return available(countPoints, {
      provenance: movements.provenance,
      asOf: movements.asOf,
      stale: movements.stale,
    })
  }

  return unavailable({ endpoint: '/api/v1/series1/events', status: 'PARTIAL', reason: 'not_enough_ordered_points' })
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const session = await requireSession()
  // ONE read for the whole page. Every surface below is a view onto the same
  // registry, so two cards can never disagree about the same vault.
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const vaults = registry.vaults
  const asset = denomination(vaults)

  const activeVaults = mapAvailability(vaults, (list) =>
    formatNumber(list.filter((vault) => vault.status === 'ACTIVE').length),
  )

  const totalValueLocked = asMoney(sumAcrossVaults(vaults, (vault) => mapAvailability(vault.totalAssetsAtomic, BigInt)), asset)
  const deployedCapitalAtomic = sumAcrossVaults(vaults, deployedAtomic)
  const availableCapitalAtomic = sumAcrossVaults(vaults, idleAtomic)
  const deployedCapital = asMoney(deployedCapitalAtomic, asset)
  const availableCapital = asMoney(availableCapitalAtomic, asset)
  const deploymentRatioRaw = combine(deployedCapitalAtomic, availableCapitalAtomic, (deployed, idle) => {
    const total = deployed + idle
    if (total === ZERO) return 0
    return Number((deployed * BPS) / total)
  })
  const deploymentRatio = mapAvailability(
    deploymentRatioRaw,
    (bps) => `${formatNumber(bps / 100, { maximumFractionDigits: 1 })}%`,
  )
  const breachedPockets = mapAvailability(registry.rebalancing, (rows) =>
    formatNumber(rows.filter((row) => row.breached).length),
  )
  const recentMovements = mapAvailability(registry.movements, (rows) => formatNumber(rows.length))
  const liveSources = available(
    `${formatNumber(registry.sources.filter((source) => source.status === 'LIVE').length)}/${formatNumber(registry.sources.length)}`,
  )
  const recentTrend = recentActivityTrend(registry.movements, asset)
  const movementVisual = movementTypeBars(registry.movements)

  const kpis: readonly OverviewKpi[] = [
    { id: 'vaults-active', label: 'Active vaults', value: activeVaults },
    { id: 'rebalance', label: 'Above threshold', value: breachedPockets },
    { id: 'movements', label: 'Recent movements', value: recentMovements },
    { id: 'sources', label: 'Live sources', value: liveSources },
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
