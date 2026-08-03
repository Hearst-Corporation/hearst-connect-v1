import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { ClientExceptionTable } from '@/components/vaults/client-exception-table'
import { DeploymentQueue } from '@/components/vaults/deployment-queue'
import { MovementLedger } from '@/components/vaults/movement-ledger'
import { RebalancingQueue } from '@/components/vaults/rebalancing-queue'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { VaultSummaryCard } from '@/components/vaults/vault-summary-card'
import { requireSession } from '@/lib/auth'
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format'
import { publicUser } from '@/lib/session'
import {
  combine,
  editorial,
  isAvailable,
  mapAvailability,
  parseVaultId,
  requiresRebalancing,
  type Availability,
  type Vault,
  type VaultId,
} from '@/lib/vaults/model'
import { deployedAtomic, idleAtomic } from '@/lib/vaults/model'
import { loadVault } from '@/lib/vaults/registry'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/* ── Route ────────────────────────────────────────────────────────────────── */

type PageProps = Readonly<{ params: Promise<{ vaultId: string }> }>

/**
 * The tab title is derived from the ROUTE PARAMETER, not from a reading.
 *
 * A vault identifier carries its chain and its contract, so its short form is
 * a description of the object rather than an invented name — and deriving it
 * here costs no extra call to the service before the page itself runs.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vaultId } = await params
  const parsed = parseVaultId(vaultId)
  if (parsed === null) return { title: 'Vault' }
  const short = formatAddress(parsed.contractAddress)
  return { title: short === null ? 'Vault' : `Vault ${short}` }
}

function amountOf(vault: Vault, atomic: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, atomic, (asset, raw) => {
    const formatted = formatCurrency(raw.toString(), { unit: '', fromAtomic: 10 ** asset.decimals })
    return `${formatted} ${asset.symbol}`
  })
}

/**
 * A drift is a gap between two shares, so it reads in signed POINTS —
 * "+2.15 pt". Raw basis points are the wire format, not a figure an operator
 * compares against a threshold at a glance.
 */
function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} pt`
}
function lastRebalanceReading(vault: Vault): Availability<string> {
  if (!isAvailable(vault.rebalancing)) return vault.rebalancing
  const at = vault.rebalancing.value.lastRebalanceAt
  if (at === null) {
    return { kind: 'unavailable', status: 'EMPTY', endpoint: '/api/v1/rebalancing/status', reason: null }
  }
  return editorial(`${formatDateTime(at)} · ${formatRelativeTime(at)}`)
}

export default async function Page({ params }: PageProps) {
  const { vaultId } = await params
  const session = await requireSession()
  const user = publicUser(session)
  // Next decodes the route segment already; `entityHref` encodes it on the way
  // out, so the identifier that arrives here is the one the model produced.
  const { registry, vault } = await loadVault(vaultId as VaultId, session.name)

  if (vault === null) notFound()
  const scopedVaults: Availability<readonly Vault[]> = mapAvailability(registry.vaults, (list) =>
    list.filter((candidate) => candidate.id === vault.id),
  )
  const scopedDeployments = mapAvailability(registry.deployments, (list) =>
    list.filter((deployment) => deployment.vaultId === vault.id),
  )
  const scopedRebalancing = mapAvailability(registry.rebalancing, (rows) =>
    rows.filter((row) => row.vaultId === vault.id),
  )
  const scopedMovements = mapAvailability(registry.movements, (list) =>
    list.filter((movement) => movement.vaultId === vault.id),
  )

  const ledgerIsEmptyForThisVault =
    isAvailable(registry.movements) &&
    isAvailable(scopedMovements) &&
    registry.movements.value.length > 0 &&
    scopedMovements.value.length === 0

  const activeStatus = editorial(vault.status)
  const totalValue = amountOf(vault, vault.totalAssetsAtomic)
  const deployedValue = amountOf(vault, deployedAtomic(vault))
  const idleValue = amountOf(vault, idleAtomic(vault))
  const driftValue = mapAvailability(vault.worstDriftBps, driftPoints)
  const strategiesCount = mapAvailability(vault.strategies, (rows) => formatNumber(rows.length))
  const actionState = requiresRebalancing(vault)
  const actionLabel = !isAvailable(actionState)
    ? 'Action unavailable'
    : actionState.value
      ? 'Rebalance review'
      : 'No pending review'

  return (
    <GreenCommandCenterShell
      label="Hearst Connect vault detail cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Vault detail status">
        <Panel className={gcc.metricCard}>
          <h2>Vault</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(vault.label)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Status</h2>
          <div className={gcc.metricText}>
            <Reading value={activeStatus} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Total value</h2>
          <div className={gcc.metricText}>
            <Reading value={totalValue} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Deployed / idle</h2>
          <div className={gcc.metricText}>
            <Reading value={deployedValue} className={gcc.metricValue} />
            <Reading value={idleValue} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Strategy pockets</h2>
          <div className={gcc.metricText}>
            <Reading value={strategiesCount} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>
            Action <span>state</span>
          </p>
          <p className={gcc.decisionMeta}>{actionLabel}</p>
          <p className={gcc.decisionActionMuted}>{formatAddress(vault.contractAddress) ?? vault.contractAddress}</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Vault summary and key signals">
        <VaultSummaryCard vault={vault} />
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Current drift</h3>
            <Reading value={driftValue} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Last rebalance</h3>
            <Reading value={lastRebalanceReading(vault)} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Utilization</h3>
            <Reading
              value={mapAvailability(vault.utilizationBps, (bps) => formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 }))}
              className={gcc.signalValue}
            />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>TVL cap</h3>
            <Reading value={amountOf(vault, vault.tvlCapAtomic)} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Capacity remaining</h3>
            <Reading value={amountOf(vault, vault.capacityRemainingAtomic)} className={gcc.signalValue} />
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Vault operations">
        <RebalancingQueue rows={scopedRebalancing} />
        {ledgerIsEmptyForThisVault ? (
          <Panel className={gcc.wavePanel}>
            <div className={gcc.heroHead}>
              <h3 className={gcc.cardTitle}>Movements</h3>
            </div>
            <div className={gcc.heroBody}>
              <p className={gcc.cellText}>
                The ledger answered but no movement is attributed to this vault.
              </p>
            </div>
          </Panel>
        ) : (
          <MovementLedger movements={scopedMovements} vaults={scopedVaults} limit={12} />
        )}
        <div className={gcc.rightStack}>
          <DeploymentQueue deployments={scopedDeployments} vaults={scopedVaults} />
          <ClientExceptionTable exceptions={registry.clientExceptions} />
          <Panel className={gcc.signalCard}>
            <h3>Source activity</h3>
            {registry.sources.slice(0, 4).map((source) => (
              <div key={source.endpointId} className={gcc.sourceRow}>
                <p className={gcc.cellText}>{source.label}</p>
                <span className={gcc.cellStrong}>{source.status.toLowerCase()}</span>
              </div>
            ))}
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Viewer</h3>
            <p className={gcc.cellText}>{session.name}</p>
            <p className={gcc.cellText}>{session.email}</p>
            <VaultStatusBadge status={vault.status} />
          </Panel>
        </div>
      </section>
    </GreenCommandCenterShell>
  )
}
