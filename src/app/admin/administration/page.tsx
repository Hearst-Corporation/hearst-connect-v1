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
      label="Hearst Connect administration cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Administration status">
        <Panel className={gcc.metricCard}>
          <h2>Account</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.name)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Email</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.email)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Role</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(session.role)} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Secondary screens</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial(String(SCREEN_COUNT))} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Admin log source</h2>
          <div className={gcc.metricText}>
            <Reading value={editorial('Not exposed')} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Administration <span>surface</span></p>
          <p className={gcc.decisionMeta}>Navigation and access</p>
          <p className={gcc.decisionActionMuted}>No data fallback</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Primary destinations">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Primary administration destinations</h2>
          </div>
          <div className={gcc.heroBody}>
            <div className={gcc.sourceRow}>
              <Link href={VAULT_REGISTRY_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {VAULT_REGISTRY_ENTRY.libelle}
              </Link>
              <span className={gcc.cellText}>Registry</span>
            </div>
            <div className={gcc.sourceRow}>
              <Link href={CLIENTS_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                Client directory
              </Link>
              <span className={gcc.cellText}>Directory</span>
            </div>
            <p className={gcc.cellText}>Administration log is not exposed by backend endpoints.</p>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Viewer</h3>
            <p className={gcc.cellText}>{user.name}</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Role</h3>
            <p className={gcc.signalValue}>{user.role}</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Coverage</h3>
            <p className={gcc.cellText}>Secondary screens grouped below.</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Secondary navigation">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Secondary screens</h3>
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
          <h3 className={gcc.cardTitle}>Contracts</h3>
          <p className={gcc.cellText}>Roles and administration audit remain not exposed.</p>
          <p className={gcc.cellText}>No smart-contract action is simulated here.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
