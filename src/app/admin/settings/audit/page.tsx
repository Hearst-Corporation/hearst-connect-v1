import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { Callout } from '@/components/compositions'
import { AuditExplorer } from '@/features/settings/audit-explorer'
import { requireSession } from '@/lib/auth'
import { loadAudit } from '@/lib/settings/load'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

/**
 * LE JOURNAL D'AUDIT — qui a fait quoi, quand.
 *
 * Changements de réglages, décisions, étapes d'offre, paiements Fireblocks,
 * courriels, verdicts Sumsub, demandes des clients : un seul fil, le plus
 * récent en tête. En production il est en ajout seul — rien ne s'y efface.
 */
export default async function AuditPage() {
  await requireSession()
  const entries = await loadAudit(500)

  return (
    <DashboardShell>
      <DashboardHeader
        title="Audit log"
        description="Every change, decision, payment, email and compliance event — who, what, when. Append-only."
        kpis={[]}
      />
      {entries === null ? (
        <Callout tone="warning" title="The audit log could not be read">
          The backend does not publish it yet — nothing is shown rather than a guess.
        </Callout>
      ) : (
        <DashCard title="Events" subtitle="Newest first">
          <AuditExplorer entries={entries} />
        </DashCard>
      )}
    </DashboardShell>
  )
}
