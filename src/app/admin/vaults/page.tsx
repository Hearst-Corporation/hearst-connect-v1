import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { VaultDataTable } from '@/components/vaults/vault-data-table'
import { VaultValueBreakdown } from '@/components/vaults/vault-value-breakdown'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { isAvailable, mapAvailability } from '@/lib/vaults/model'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vault registry' }
export const dynamic = 'force-dynamic'

function VaultMetric({
  title,
  value,
}: Readonly<{
  title: string
  value: import('@/lib/vaults/model').Availability<string>
}>) {
  return (
    <Panel className={gcc.metricCard}>
      <h2>{title}</h2>
      <div className={gcc.metricText}>
        <Reading value={value} className={gcc.metricValue} />
      </div>
    </Panel>
  )
}

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)
  const user = publicUser(session)
  const activeVaults = mapAvailability(
    registry.vaults,
    (rows) => formatNumber(rows.filter((vault) => vault.status === 'ACTIVE').length),
  )
  const totalVaults = mapAvailability(registry.vaults, (rows) => formatNumber(rows.length))
  const liveSources = {
    kind: 'available',
    value: `${registry.sources.filter((source) => source.status === 'LIVE').length} / ${registry.sources.length}`,
    provenance: 'manual',
    asOf: null,
    stale: false,
  } as const
  const movements = mapAvailability(registry.movements, (rows) => formatNumber(rows.length))
  const exceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const decisionLabel =
    isAvailable(exceptions) && Number.parseInt(exceptions.value, 10) > 0 ? 'Review pending' : 'No pending review'

  return (
    <GreenCommandCenterShell
      label="Hearst Connect vault registry cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Vault registry status">
        <VaultMetric title="Active vaults" value={activeVaults} />
        <VaultMetric title="Vaults listed" value={totalVaults} />
        <VaultMetric title="Live sources" value={liveSources} />
        <VaultMetric title="Indexed movements" value={movements} />
        <VaultMetric title="Client exceptions" value={exceptions} />
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>
            Vault <span>registry</span>
          </p>
          <p className={gcc.decisionMeta}>Operational view</p>
          <p className={gcc.decisionActionMuted}>{decisionLabel}</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Vault table and signals">
        <VaultDataTable vaults={registry.vaults} />
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Status</h3>
            <Reading value={activeVaults} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Coverage</h3>
            <Reading value={liveSources} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Exceptions</h3>
            <Reading value={exceptions} className={gcc.signalValue} />
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Vault value breakdown">
        <VaultValueBreakdown vaults={registry.vaults} />
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Registry endpoint</h3>
            <p className={gcc.cellText}>`GET /api/v1/vault`</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Threshold</h3>
            <p className={gcc.cellText}>Console threshold ±2,00 pt</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Navigation</h3>
            <p className={gcc.cellText}>Detail pages in `/admin/vaults/{'{vaultId}'}`</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Data contract</h3>
            <p className={gcc.cellText}>No fallback count when a source is unavailable.</p>
          </article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Source activity</h3>
          {registry.sources.map((source) => (
            <div key={source.endpointId} className={gcc.sourceRow}>
              <p className={gcc.cellText}>{source.label}</p>
              <span className={gcc.cellStrong}>{source.status.toLowerCase()}</span>
            </div>
          ))}
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
