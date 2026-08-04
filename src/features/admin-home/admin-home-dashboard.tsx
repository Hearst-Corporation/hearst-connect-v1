import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import type { AdminRegistry } from '@/lib/vaults/model'
import {
  available,
  isAvailable,
  mapAvailability,
  REBALANCING_THRESHOLD_BPS,
  unavailable,
} from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'
import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { GreenDecisionPanel, GreenMetricStrip, type MetricCell } from './metric-strip'
import { GreenHeroChartPanel } from '@/components/charts'
import { GreenSignalStack, type Signal } from './signal-stack'
import { GreenWavePanel } from './wave-panel'
import { GreenInfoGrid, GreenVaultPanel } from './activity-panel'

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
  const thresholdPoints = formatNumber(REBALANCING_THRESHOLD_BPS / 100, { maximumFractionDigits: 2 })

  /* ── Top band: the five estate figures, then the decision queue ────────── */
  const cells: readonly MetricCell[] = [
    {
      id: 'vaults-active',
      title: 'Coffres actifs',
      value: overview.activeVaults,
      glyph: '₿',
    },
    {
      id: 'breached',
      title: `Au-dessus du seuil console (±${thresholdPoints} pt)`,
      value: overview.breachedPockets,
      glyph: '●',
      hollow: true,
    },
    {
      id: 'movements',
      title: 'Mouvements récents',
      value: overview.recentMovements,
      glyph: '↯',
      hollow: true,
    },
    {
      id: 'sources',
      title: 'Sources en direct',
      value: mapAvailability(overview.liveSources, (value) => value.replace('/', ' / ')),
      glyph: '◔',
      hollow: true,
    },
    {
      id: 'estate',
      title: 'Valeur du patrimoine',
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
      title: 'Capital déployé',
      value: overview.deployedCapital,
    },
    { id: 'capital-available', title: 'Capital disponible', value: overview.availableCapital },
    {
      id: 'deployment-ratio',
      title: 'Taux de déploiement',
      value: overview.deploymentRatio,
    },
    {
      id: 'rebalancing',
      title: 'État du rééquilibrage',
      value: mapAvailability(registry.rebalancing, (rows) => formatNumber(rows.length)),
    },
    {
      id: 'denomination',
      title: 'Dénomination',
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

  const decisionActionable = isAvailable(pendingDecisions) && parseCount(pendingDecisions.value) > 0
  const decisionHint = !isAvailable(pendingDecisions)
    ? 'File indisponible'
    : decisionActionable
      ? 'À examiner'
      : 'Aucune revue en attente'

  return (
    <ConsoleShell
      label="Hearst Connect — accueil de la console d’administration"
      rail={<ConsoleRail currentHref="/admin" userName={user.name} userRole={user.role} />}
    >
      <GreenMetricStrip
        cells={cells}
        decision={
          <GreenDecisionPanel pending={pendingDecisions} hint={decisionHint} actionable={decisionActionable} />
        }
      />

      <section className={gcc.mainRow} aria-label="Activité et capital" data-gcc="main-row">
        <GreenHeroChartPanel
          title="Activité récente"
          trend={overview.recentTrend}
          countLabel={overview.recentMovements}
        />
        <GreenSignalStack signals={signals} />
      </section>

      <section className={gcc.bottomRow} aria-label="Types de mouvement, détail opérationnel et registre des coffres" data-gcc="bottom-row">
        <GreenWavePanel title="Types de mouvement" bars={overview.movementBars} availability={registry.movements} />
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
        />
      </section>
    </ConsoleShell>
  )
}
