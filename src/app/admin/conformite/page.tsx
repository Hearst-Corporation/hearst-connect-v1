import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Absent, Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { requireSession } from '@/lib/auth'
import { DATA_COVERAGE_ENTRY } from '@/lib/admin-nav'
import { formatNumber } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

/**
 * Compliance — the KYC/KYB review queue, before it has a source.
 *
 * Three sections used to announce the same absence three times: a bar of
 * filter chips that filter nothing, each trailing a dash where a count would
 * go; a card wrapping a table that never drew a row; and a third card listing
 * the endpoints still missing. A reader had to cross two boxes to learn one
 * fact.
 *
 * It reads as one section now. The absence is stated once, in the main
 * column, with what the source owes it. The five journey stages move into the
 * deliberate secondary column, where they are what they always were —
 * a description of the process, not a set of counters at zero. Their
 * explanation used to hide in a `title` attribute; it is on screen now.
 */

const SEGMENTS = [
  { id: 'a-verifier', label: 'To review', hint: 'Case received, review not started' },
  { id: 'en-attente', label: 'Pending', hint: 'Document or response awaited from client' },
  { id: 'risque-eleve', label: 'High risk', hint: 'Sanctions, PEP, or adverse media signal' },
  { id: 'a-renouveler', label: 'Due for renewal', hint: 'Verification has reached its due date' },
  { id: 'termine', label: 'Completed', hint: 'Decision rendered and logged' },
] as const

/** What the backend still owes this screen. */
const MISSING_FROM_SOURCE = [
  'Reading cases with status, age, and due date',
  'Detail: beneficial owners, documents, sanctions and PEP checks',
  'Decision actions only if exposed by the backend',
  'Analyst assignment and decision log',
] as const

function ComplianceMetric({
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

  const queueSource = unavailable({
    endpoint: '/api/v1/compliance',
    status: 'NOT_EXPOSED',
    reason: 'no_compliance_review_endpoint',
  })

  const clientExceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const stages = unavailable({
    endpoint: '/api/v1/compliance',
    status: 'NOT_EXPOSED',
    reason: 'process_stages_are_ui_definition_not_case_counts',
  })

  return (
    <GreenCommandCenterShell
      label="Hearst Connect compliance cockpit"
      rail={<GreenCommandRail currentHref="/admin/conformite" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Compliance status">
        <ComplianceMetric title="Queue source" value={queueSource} />
        <ComplianceMetric title="Cases" value={queueSource} />
        <ComplianceMetric title="High risk" value={queueSource} />
        <ComplianceMetric title="Due renewal" value={queueSource} />
        <ComplianceMetric title="Process stages" value={stages} />
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Compliance <span>queue</span></p>
          <p className={gcc.decisionMeta}>Source not exposed</p>
          <p className={gcc.decisionActionMuted}>No case submitted</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Compliance queue">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Review queue</h2>
          </div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>
              The backend currently exposes no compliance review queue endpoint. Cases are therefore not rendered as zero and no placeholder queue is shown.
            </p>
            <p className={gcc.cellText}>
              The journey remains defined so the page can switch to live cases without layout change once the source opens.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={DATA_COVERAGE_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {DATA_COVERAGE_ENTRY.libelle}
              </Link>
              <Link href="/admin/operations" className="text-sm text-accent-300 underline underline-offset-2">
                Operations
              </Link>
            </div>
          </div>
        </Panel>

        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Queue endpoint</h3>
            <Absent availability={queueSource} showRoute={false} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Client exceptions</h3>
            <Reading value={clientExceptions} className={gcc.signalValue} />
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Coverage path</h3>
            <p className={gcc.cellText}>Track endpoint readiness in Data coverage.</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Compliance details">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Case journey</h3>
          </div>
          <div className={gcc.heroBody}>
            {SEGMENTS.map((segment, index) => (
              <p key={segment.id} className={gcc.cellText}>
                {index + 1}. {segment.label} · {segment.hint}
              </p>
            ))}
          </div>
        </Panel>

        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Queue read</h3>
            <Absent availability={queueSource} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Review actions</h3>
            <Absent availability={queueSource} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Mandatory fields</h3>
            {MISSING_FROM_SOURCE.slice(0, 2).map((item) => (
              <p key={item} className={gcc.cellText}>
                {item}
              </p>
            ))}
          </article>
          <article className={gcc.infoCell}>
            <h3>Decision trail</h3>
            {MISSING_FROM_SOURCE.slice(2).map((item) => (
              <p key={item} className={gcc.cellText}>
                {item}
              </p>
            ))}
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
