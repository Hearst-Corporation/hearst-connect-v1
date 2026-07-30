import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import type { AdminRegistry } from '@/lib/vaults/model'
import {
  available,
  isAvailable,
  mapAvailability,
  unavailable,
  REBALANCING_THRESHOLD_BPS,
} from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'
import { GreenCommandCenterShell, gcc } from './green-command-center-shell'
import { GreenCommandRail } from './green-command-rail'
import { GreenDecisionPanel, GreenMetricStrip, type MetricCell } from './green-metric-strip'
import { GreenHeroChartPanel } from './green-hero-chart-panel'
import { GreenSignalStack, type Signal } from './green-signal-stack'
import { GreenWavePanel } from './green-wave-panel'
import { GreenInfoGrid, GreenVaultPanel } from './green-activity-panel'

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
      caption: 'Vaults reporting a readable snapshot',
      support: 'Register · /api/v1/vault',
      glyph: '₿',
    },
    {
      id: 'breached',
      title: 'Above threshold',
      value: overview.breachedPockets,
      // Le seuil est INTERPOLÉ depuis la constante, pas recopié : une légende
      // qui répète un chiffre finit par mentir le jour où le chiffre change.
      caption: `Pockets past the ${REBALANCING_THRESHOLD_BPS} bps console threshold`,
      support: 'Strategies · /api/v1/vault/strategies',
      glyph: '●',
      hollow: true,
    },
    {
      id: 'movements',
      title: 'Recent movements',
      value: overview.recentMovements,
      caption: 'Indexed ledger events in the window',
      support: 'Ledger · /api/v1/series1/events',
      glyph: '↯',
      hollow: true,
    },
    {
      id: 'sources',
      title: 'Live sources',
      value: overview.liveSources,
      caption: 'Endpoints answering, over those declared',
      support: 'Backend endpoint registry',
      glyph: '◔',
      hollow: true,
    },
    {
      id: 'estate',
      title: 'Estate value',
      value: overview.totalValueLocked,
      caption: 'Everything the register holds',
      support: 'Snapshot · /api/v1/vault',
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
      note: 'Placed in a strategy',
    },
    { id: 'capital-available', title: 'Available capital', value: overview.availableCapital, note: 'Idle in the vault' },
    {
      id: 'deployment-ratio',
      title: 'Deployment ratio',
      value: overview.deploymentRatio,
      note: 'Deployed over total',
    },
    {
      id: 'rebalancing',
      title: 'Rebalancing state',
      value: mapAvailability(registry.rebalancing, (rows) => `${formatNumber(rows.length)} pockets tracked`),
      note: 'Contract-reported drift',
    },
    {
      id: 'denomination',
      title: 'Denomination',
      value: mapAvailability(overview.asset, (asset) => `${asset.symbol} · ${formatNumber(asset.decimals)} dp`),
      note: 'Shared across the register',
    },
  ]

  /* ── Bottom-right: the vault register and the source list ──────────────── */
  const vaultLines = isAvailable(vaults)
    ? vaults.value.map((vault) => ({
        id: vault.id,
        label: vault.label,
        detail: `${vault.status.toLowerCase()} · ${formatAddress(vault.contractAddress) ?? vault.contractAddress}`,
      }))
    : []

  const sourceLines = registry.sources.map((source) => ({
    id: source.endpointId,
    label: source.label,
    status: source.status.toLowerCase(),
  }))

  /*
   * La note ne RECALCULE pas le compte de sources actives.
   *
   * `overview.liveSources` porte déjà « n/m ». Le dashboard refaisait le même
   * filtre `status === 'LIVE'` que `estateOverview`, pour afficher deux fois le
   * même chiffre côte à côte. La note nomme seulement ce qui est compté.
   */
  const sourcesNote = `endpoints answering, of ${formatNumber(registry.sources.length)} declared`

  return (
    <GreenCommandCenterShell
      label="Hearst Connect green command center — administration home laboratory"
      rail={<GreenCommandRail currentHref="/admin" userName={user.name} userRole={user.role} />}
    >
      <GreenMetricStrip
        cells={cells}
        decision={<GreenDecisionPanel pending={pendingDecisions} hint="Review now" />}
      />

      <section className={gcc.mainRow} aria-label="Activity and capital" data-gcc="main-row">
        <GreenHeroChartPanel
          title="Recent activity"
          trend={overview.recentTrend}
          axisLabel={isAvailable(overview.asset) ? 'Value moved' : 'Movements per day'}
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
          sourcesNote={sourcesNote}
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
