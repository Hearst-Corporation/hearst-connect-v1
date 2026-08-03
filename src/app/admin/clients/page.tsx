import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Absent, Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { DATA_COVERAGE_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { unavailable, mapAvailability, type Availability } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — the organizations directory, before it has a source.
 *
 * ── What this screen is allowed to say ────────────────────────────────────
 * The service exposes no client directory: `GET /api/v1/clients` answers 404
 * (verified against the production backend, 2026-07-28). That is an absence,
 * not an empty directory, and the two are opposite facts — "this operator has
 * no clients" would be a claim, and we have no reading that supports it. So
 * the screen states that nothing can be enumerated, and lists nothing.
 *
 * ── Why there is a link out of it ─────────────────────────────────────────
 * An honest empty state that leaves the reader with nowhere to go is still a
 * dead end. A client is not unreachable today, only un-enumerable: a vault
 * names the client it belongs to whenever the service provides one, so the
 * vault registry is the one place client context exists. The bridge below is
 * that route, plus a single link to Data coverage for the technical account
 * of what is and is not served.
 *
 * ── Why it stays one card ─────────────────────────────────────────────────
 * The screen used to be three boxes deep to deliver a single piece of news: a
 * toolbar carrying a search field that searched nothing, a card wrapping a
 * nine-column table that never drew a row, and underneath, a second card
 * repeating the same absence in different words. One state says it once, and
 * an empty state does not grow into a second dashboard.
 */

const MISSING_FROM_SOURCE = [
  'Client directory endpoint',
  'Client id on each vault',
  'Per-client compliance status',
] as const

function ClientsMetric({
  title,
  value,
}: Readonly<{ title: string; value: Availability<string> }>) {
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
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
  const user = publicUser(session)

  const clientDirectory = unavailable({
    endpoint: '/api/v1/clients',
    status: 'NOT_EXPOSED',
    reason: 'no_client_directory_endpoint',
  })

  const complianceDirectory = unavailable({
    endpoint: '/api/v1/compliance',
    status: 'NOT_EXPOSED',
    reason: 'no_client_compliance_endpoint',
  })

  const clientExceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const reachableVaults = mapAvailability(registry.vaults, (rows) => formatNumber(rows.length))

  return (
    <GreenCommandCenterShell
      label="Hearst Connect clients cockpit"
      rail={<GreenCommandRail currentHref="/admin/clients" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Client status">
        <ClientsMetric title="Client directory" value={clientDirectory} />
        <ClientsMetric title="Compliance source" value={complianceDirectory} />
        <ClientsMetric title="Client exceptions" value={clientExceptions} />
        <ClientsMetric title="Reachable vaults" value={reachableVaults} />
        <ClientsMetric title="Coverage surface" value={{ kind: 'available', value: 'Data coverage', provenance: 'manual', asOf: null, stale: false }} />
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Clients <span>status</span></p>
          <p className={gcc.decisionMeta}>Source not exposed</p>
          <p className={gcc.decisionActionMuted}>Directory unavailable</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Clients explanation">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Directory</h2>
          </div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>
              No endpoint enumerates organizations today. This page keeps the client surface visible without inventing rows or fallback counts.
            </p>
            <p className={gcc.cellText}>
              Reach client context through vault ownership while the directory endpoint is not exposed.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={VAULT_REGISTRY_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {VAULT_REGISTRY_ENTRY.libelle}
              </Link>
              <Link href={DATA_COVERAGE_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {DATA_COVERAGE_ENTRY.libelle}
              </Link>
            </div>
          </div>
        </Panel>

        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Source contract</h3>
            <Absent availability={clientDirectory} showRoute={false} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Compliance contract</h3>
            <Absent availability={complianceDirectory} showRoute={false} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Client exceptions</h3>
            <Reading value={clientExceptions} className={gcc.signalValue} />
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Client requirements">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Missing from source</h3>
          </div>
          <div className={gcc.heroBody}>
            {MISSING_FROM_SOURCE.map((item) => (
              <p key={item} className={gcc.cellText}>
                {item}
              </p>
            ))}
          </div>
        </Panel>

        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Directory endpoint</h3>
            <Absent availability={clientDirectory} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Compliance endpoint</h3>
            <Absent availability={complianceDirectory} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Vault path</h3>
            <p className={gcc.cellText}>Use the vault registry to reach client-linked vault context.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Coverage path</h3>
            <p className={gcc.cellText}>Use Data coverage for endpoint-level status and reasons.</p>
          </article>
        </Panel>

        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Source activity</h3>
          {registry.sources.slice(0, 6).map((source) => (
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
