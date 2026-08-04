import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { ADMIN_SECONDARY, CLIENTS_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

const SCREEN_COUNT = ADMIN_SECONDARY.reduce((total, group) => total + group.entrees.length, 0)


export default async function Page() {
  const session = await requireSession()
  const user = publicUser(session)

  return (
    <GreenCommandCenterShell
      label="Hearst Connect — poste de pilotage administration"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="État de l’administration">
        <Panel className={gcc.metricCard}>
          <h2>Compte</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.name)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>E-mail</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.email)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Rôle</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.role)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Écrans secondaires</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(String(SCREEN_COUNT))} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Source du journal admin</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial('Non exposé')} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Surface <span>d’administration</span></p>
          <p className={gcc.decisionMeta}>Navigation et accès</p>
          <p className={gcc.decisionActionMuted}>Aucune valeur de repli</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Destinations principales">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Destinations principales d’administration</h2>
          </div>
          <div className={gcc.heroBody}>
            <div className={gcc.sourceRow}>
              <Link href={VAULT_REGISTRY_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {VAULT_REGISTRY_ENTRY.libelle}
              </Link>
              <span className={gcc.cellText}>Registre</span>
            </div>
            <div className={gcc.sourceRow}>
              <Link href={CLIENTS_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                Annuaire des clients
              </Link>
              <span className={gcc.cellText}>Annuaire</span>
            </div>
            <p className={gcc.cellText}>Le journal d’administration n’est pas exposé par les points d’accès du backend.</p>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Utilisateur</h3>
            <p className={gcc.cellText}>{user.name}</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Rôle</h3>
            <p className={gcc.signalValue}>{user.role}</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Couverture</h3>
            <p className={gcc.cellText}>Écrans secondaires regroupés ci-dessous.</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Navigation secondaire">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Écrans secondaires</h3>
          </div>
          <div className={gcc.heroBody}>
            {ADMIN_SECONDARY.flatMap((group) => group.entrees).map((entry) => (
              <div key={entry.href} className={gcc.sourceRow}>
                <Link href={entry.href} className="text-sm text-accent-300 underline underline-offset-2">
                  {entry.libelle}
                </Link>
                <span className={gcc.cellText}>{entry.detail}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          {ADMIN_SECONDARY.map((group) => (
            <article key={group.titre} className={gcc.infoCell}>
              <h3>{group.titre}</h3>
              <p className={gcc.cellText}>{group.entrees.length} destinations</p>
            </article>
          ))}
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Contrats</h3>
          <p className={gcc.cellText}>Les rôles et l’audit d’administration restent non exposés.</p>
          <p className={gcc.cellText}>Aucune action de contrat intelligent n’est simulée ici.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
