import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Callout } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { OfferForm } from './offer-form'

export const metadata: Metadata = { title: 'New offer' }
export const dynamic = 'force-dynamic'

/**
 * Créer une offre — l'entrée du parcours commercial.
 *
 * Après l'appel avec le client vient la proposition : à qui, combien, sur
 * quelle allocation, pour combien de temps. L'offre naît en brouillon ; rien
 * ne part tant que personne ne l'envoie.
 */
export default async function NewOfferPage() {
  await requireSession()

  return (
    <DashboardShell>
      <DashboardHeader
        title="New offer"
        description="What is proposed to this client — the split here becomes their vault target once signed."
        kpis={[]}
      />

      <BentoGrid>
        <BentoCard span={8}>
          <OfferForm />
        </BentoCard>

        <BentoCard span={4}>
          <div className="flex flex-col gap-4">
            <Callout tone="info" title="How the profile works">
              The three profiles seed the allocation from what the client answered in the
              qualification form. They are a starting point: two clients on the same profile rarely
              hold the same constraints, so every slider stays editable.
            </Callout>
            <Callout tone="info" title="What happens next">
              The offer is saved as a draft. Sending it, recording the client&apos;s answer, issuing
              their credentials and calling the funds are each a separate step — so an offer is
              never half-sent.
            </Callout>
          </div>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
