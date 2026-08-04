import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Panel, Reading } from '@/components/layout/console'
import { VaultDataTable } from '@/components/vaults/vault-data-table'
import { VaultValueBreakdown } from '@/components/vaults/vault-value-breakdown'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { editorial, isAvailable, measuredCount } from '@/lib/vaults/model'
import { activeVaultCount } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Registre des coffres' }
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
  // Canonical, unreadable-aware count (VER-05) — no longer reimplemented here.
  const activeVaults = activeVaultCount(registry.vaults)
  const totalVaults = measuredCount(registry.vaults)
  // A console-assembled ratio over the source-health strip, which is always
  // present. Editorial, not a single backend field — so it is never badged "Live".
  const liveSources = editorial(
    `${registry.sources.filter((source) => source.status === 'LIVE').length} / ${registry.sources.length}`,
  )
  const movements = measuredCount(registry.movements)
  const exceptions = measuredCount(registry.clientExceptions)
  const decisionLabel =
    isAvailable(exceptions) && Number.parseInt(exceptions.value, 10) > 0 ? 'Revue en attente' : 'Aucune revue en attente'

  return (
    <ConsoleShell
      label="Poste de pilotage registre des coffres Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="État du registre des coffres">
        <VaultMetric title="Coffres actifs" value={activeVaults} />
        <VaultMetric title="Coffres répertoriés" value={totalVaults} />
        <VaultMetric title="Sources en direct" value={liveSources} />
        <VaultMetric title="Mouvements indexés" value={movements} />
        <VaultMetric title="Anomalies clients" value={exceptions} />
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>
            Registre <span>des coffres</span>
          </p>
          <p className={gcc.decisionMeta}>Vue opérationnelle</p>
          <p className={gcc.decisionActionMuted}>{decisionLabel}</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Tableau des coffres et signaux">
        <VaultDataTable vaults={registry.vaults} />
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>État</h3>
            <Reading value={activeVaults} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Couverture</h3>
            <Reading value={liveSources} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Anomalies</h3>
            <Reading value={exceptions} className={gcc.signalValue} />
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Répartition de la valeur des coffres">
        <VaultValueBreakdown vaults={registry.vaults} />
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Point d’accès du registre</h3>
            <p className={gcc.cellText}>`GET /api/v1/vault`</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Seuil</h3>
            <p className={gcc.cellText}>Seuil de la console ±2,00 pt</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Navigation</h3>
            <p className={gcc.cellText}>Pages de détail dans `/admin/vaults/{'{vaultId}'}`</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Contrat de données</h3>
            <p className={gcc.cellText}>Aucun décompte de repli quand une source est indisponible.</p>
          </article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Activité des sources</h3>
          {registry.sources.map((source) => (
            <div key={source.endpointId} className={gcc.sourceRow}>
              <p className={gcc.cellText}>{source.label}</p>
              <span className={gcc.cellStrong}>{source.status.toLowerCase()}</span>
            </div>
          ))}
        </Panel>
      </section>
    </ConsoleShell>
  )
}
