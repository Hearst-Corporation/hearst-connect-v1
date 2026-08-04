import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { Panel } from '@/components/compositions'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Absent, Reading } from '@/components/layout/console'
import { requireSession } from '@/lib/auth'
import { DATA_COVERAGE_ENTRY } from '@/lib/admin-nav'
import { formatNumber } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Conformité' }
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
  { id: 'a-verifier', label: 'À vérifier', hint: 'Dossier reçu, revue non commencée' },
  { id: 'en-attente', label: 'En attente', hint: 'Document ou réponse attendu du client' },
  { id: 'risque-eleve', label: 'Risque élevé', hint: 'Signal de sanctions, PPE ou médias défavorables' },
  { id: 'a-renouveler', label: 'À renouveler', hint: 'La vérification a atteint son échéance' },
  { id: 'termine', label: 'Terminé', hint: 'Décision rendue et journalisée' },
] as const

/** What the backend still owes this screen. */
const MISSING_FROM_SOURCE = [
  'Lecture des dossiers avec état, ancienneté et échéance',
  'Détail : bénéficiaires effectifs, documents, contrôles sanctions et PPE',
  'Actions de décision uniquement si exposées par le backend',
  'Affectation d’analyste et journal des décisions',
] as const

function ComplianceMetric({
  title,
  value,
}: Readonly<{ title: string; value: Availability<string> }>) {
  return (
    <Panel tone="plain" className={gcc.metricCard}>
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
    <ConsoleShell
      label="Hearst Connect — poste de pilotage conformité"
      rail={<ConsoleRail currentHref="/admin/conformite" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="État de la conformité">
        <ComplianceMetric title="Source de la file" value={queueSource} />
        <ComplianceMetric title="Dossiers" value={queueSource} />
        <ComplianceMetric title="Risque élevé" value={queueSource} />
        <ComplianceMetric title="Renouvellement dû" value={queueSource} />
        <ComplianceMetric title="Étapes du processus" value={stages} />
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>File de <span>conformité</span></p>
          <p className={gcc.decisionMeta}>Source non exposée</p>
          <p className={gcc.decisionActionMuted}>Aucun dossier soumis</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="File de revue">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>File de revue</h2>
          </div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>
              Le backend n’expose actuellement aucun point d’accès de file de revue de conformité. Les dossiers ne sont donc pas affichés comme zéro et aucune file de substitution n’est présentée.
            </p>
            <p className={gcc.cellText}>
              Le parcours reste défini afin que la page puisse basculer vers des dossiers en direct sans changement de mise en page dès que la source s’ouvre.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={DATA_COVERAGE_ENTRY.href} className="text-sm text-accent-300 underline underline-offset-2">
                {DATA_COVERAGE_ENTRY.libelle}
              </Link>
              <Link href="/admin/operations" className="text-sm text-accent-300 underline underline-offset-2">
                Opérations
              </Link>
            </div>
          </div>
        </Panel>

        <aside className={gcc.rightStack}>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Point d’accès de la file</h3>
            <Absent availability={queueSource} showRoute={false} />
          </Panel>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Anomalies clients</h3>
            <Reading value={clientExceptions} className={gcc.signalValue} />
          </Panel>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Chemin de couverture</h3>
            <p className={gcc.cellText}>Suivez la disponibilité des points d’accès dans Couverture des données.</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Détails de conformité">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Parcours du dossier</h3>
          </div>
          <div className={gcc.heroBody}>
            {SEGMENTS.map((segment, index) => (
              <p key={segment.id} className={gcc.cellText}>
                {index + 1}. {segment.label} · {segment.hint}
              </p>
            ))}
          </div>
        </Panel>

        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Lecture de la file</h3>
            <Absent availability={queueSource} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Actions de revue</h3>
            <Absent availability={queueSource} showRoute={false} />
          </article>
          <article className={gcc.infoCell}>
            <h3>Champs obligatoires</h3>
            {MISSING_FROM_SOURCE.slice(0, 2).map((item) => (
              <p key={item} className={gcc.cellText}>
                {item}
              </p>
            ))}
          </article>
          <article className={gcc.infoCell}>
            <h3>Trace de décision</h3>
            {MISSING_FROM_SOURCE.slice(2).map((item) => (
              <p key={item} className={gcc.cellText}>
                {item}
              </p>
            ))}
          </article>
        </Panel>

        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Activité des sources</h3>
          {registry.sources.slice(0, 6).map((source) => (
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
