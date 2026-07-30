import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import type { AdminRegistry } from '@/lib/vaults/model'
import {
  available,
  isAvailable,
  mapAvailability,
  unavailable,
} from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'
import { GreenCommandCenterShell, gcc } from './green-command-center-shell'
import { GreenCommandRail } from './green-command-rail'
import { GreenDecisionPanel, GreenMetricStrip, type MetricCell } from './green-metric-strip'
import { GreenHeroChartPanel } from './green-hero-chart-panel'
import { GreenSignalStack, type Signal } from './green-signal-stack'
import { GreenWavePanel } from './green-wave-panel'
import { GreenInfoGrid, GreenVaultPanel } from './green-activity-panel'

function parseCount(value: string): number {
  const digits = value.replaceAll(/[^0-9]/g, '')
  if (digits === '') return 0
  const count = Number.parseInt(digits, 10)
  return Number.isFinite(count) ? count : 0
}

/**
 * The green command center, carrying the administration Home reading.
 *
 * ── The contract of this file ─────────────────────────────────────────────
 * The reference prototype supplies the GEOMETRY and the MATTER. `/admin`
 * supplies the CONTENT and the DATA CONTRACTS. This component is the mapping
 * between the two, and it is the only place that mapping is stated.
 *
 * It takes an `AdminRegistry` that has already been read ONCE by the route, and
 * derives every figure through the same `estateOverview` the real `/admin`
 * page uses. Two consequences worth naming: the laboratory cannot show a number
 * the console does not show, and it cannot disagree with the console about one.
 *
 * Not a single figure here is written as a literal. Where the service has no
 * source — the estate total on this deployment, capital deployed, the
 * rebalancing breach count, the deployment ledger — the panel renders the named
 * absence with its route. The prototype's `$428M`, `18.4%`, `+22.7%`, `1,089`
 * and `95.8%` appear nowhere.
 */

export function GreenAdminHomeDashboard({
  registry,
  user,
}: Readonly<{ registry: AdminRegistry; user: SessionUser }>) {
  const overview = estateOverview(registry)
  const vaults = registry.vaults

  /* ── Top band: the five estate figures, then the decision queue ────────── */
  const cells: readonly MetricCell[] = [
    {
      id: 'vaults-active',
      title: 'Active vaults',
      value: overview.activeVaults,
      glyph: '₿',
    },
    {
      id: 'breached',
      title: 'Above threshold',
      value: overview.breachedPockets,
      glyph: '●',
      hollow: true,
    },
    {
      id: 'movements',
      title: 'Recent movements',
      value: overview.recentMovements,
      glyph: '↯',
      hollow: true,
    },
    {
      id: 'sources',
      title: 'Live sources',
      value: mapAvailability(overview.liveSources, (value) => value.replace('/', ' / ')),
      glyph: '◔',
      hollow: true,
    },
    {
      id: 'estate',
      title: 'Estate value',
      value: overview.totalValueLocked,
      glyph: '⌁',
    },
  ]

  /*
   * The decision queue counts what actually needs a decision: the breached
   * pockets plus the blocked clients. Either operand missing makes the total
   * missing — a partial count of pending work would be worse than none, since
   * it would look complete.
   */
  const pendingDecisions = isAvailable(registry.rebalancing) && isAvailable(registry.clientExceptions)
    ? available(
        formatNumber(
          registry.rebalancing.value.filter((row) => row.breached).length + registry.clientExceptions.value.length,
        ),
      )
    : isAvailable(registry.clientExceptions)
      ? unavailable({
          endpoint: '/api/v1/vault/strategies',
          status: 'PARTIAL',
          reason: 'rebalancing_unreadable_total_would_be_incomplete',
        })
      : unavailable({ endpoint: '/api/v1/dashboard', reason: 'client_exceptions_unreadable' })

  /* ── Right column: the capital and source signals ──────────────────────── */
  const signals: readonly Signal[] = [
    {
      id: 'capital-deployed',
      title: 'Capital deployed',
      value: overview.deployedCapital,
    },
    { id: 'capital-available', title: 'Available capital', value: overview.availableCapital },
    {
      id: 'deployment-ratio',
      title: 'Deployment ratio',
      value: overview.deploymentRatio,
    },
    {
      id: 'rebalancing',
      title: 'Rebalancing state',
      value: mapAvailability(registry.rebalancing, (rows) => formatNumber(rows.length)),
    },
    {
      id: 'denomination',
      title: 'Denomination',
      value: mapAvailability(overview.asset, (asset) => `${asset.symbol} · ${formatNumber(asset.decimals)} dp`),
    },
  ]

  /* ── Bottom-right: the vault register and the source list ──────────────── */
  const vaultLines = isAvailable(vaults)
    ? vaults.value.map((vault) => ({
        id: vault.id,
        label: vault.label,
        detail: formatAddress(vault.contractAddress) ?? vault.contractAddress,
      }))
    : []

  const sourceLines = registry.sources.map((source) => ({
    id: source.endpointId,
    label: source.label,
    status: source.status.toLowerCase(),
  }))

  const decisionActionable = isAvailable(pendingDecisions) && parseCount(pendingDecisions.value) > 0
  const decisionHint = !isAvailable(pendingDecisions)
    ? 'Queue unavailable'
    : decisionActionable
      ? 'Review now'
      : 'No pending review'

  return (
    <GreenCommandCenterShell
      label="Hearst Connect green command center — administration home laboratory"
      rail={<GreenCommandRail currentHref="/admin" userName={user.name} userRole={user.role} />}
    >
      <GreenMetricStrip
        cells={cells}
        decision={
          <GreenDecisionPanel pending={pendingDecisions} hint={decisionHint} actionable={decisionActionable} />
        }
      />

      <section className={gcc.mainRow} aria-label="Activity and capital" data-gcc="main-row">
        <GreenHeroChartPanel
          title="Recent activity"
          trend={overview.recentTrend}
          countLabel={overview.recentMovements}
        />
        <GreenSignalStack signals={signals} />
      </section>

      <section className={gcc.bottomRow} aria-label="Movement types, operational detail and vault register" data-gcc="bottom-row">
        <GreenWavePanel title="Movement types" bars={overview.movementBars} availability={registry.movements} />
        <GreenInfoGrid
          exceptions={registry.clientExceptions}
          deployments={registry.deployments}
          sourcesLive={overview.liveSources}
          movements={registry.movements}
        />
        <GreenVaultPanel
          vaultLines={vaultLines}
          vaultAbsence={vaults}
          estateValue={overview.totalValueLocked}
          sourceLines={sourceLines}
        />
      </section>
    </GreenCommandCenterShell>
  )
}
