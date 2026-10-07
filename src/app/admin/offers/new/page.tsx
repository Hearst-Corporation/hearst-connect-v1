import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Callout } from '@/components/compositions'
import { loadDemoState } from '@/features/demo/load'
import { loadSettings } from '@/lib/settings/load'
import type { OfferTerms } from './offer-form'
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
  // Sur le backend de démonstration, le formulaire arrive rempli : on présente, on ne saisit pas.
  const [demoState, settings] = await Promise.all([loadDemoState(), loadSettings()])
  const demo = demoState !== null
  // Les termes en vigueur — ceux qu'un changement approuvé a fixés, délai passé.
  const t = settings?.values.terms as { minTicketUsdc?: number; defaultLockupMonths?: number; lockupOptions?: string[] } | undefined
  const rows = settings?.values.profiles as { id: string; miningBps: number; lendingBps: number; stableBps: number }[] | undefined
  const grid = rows ? Object.fromEntries(rows.map((r) => [r.id, { miningBps: r.miningBps, lendingBps: r.lendingBps, stableBps: r.stableBps }])) : null
  const terms: OfferTerms | null =
    t && grid && grid.conservative && grid.balanced && grid.growth
      ? {
          minTicketUsdc: Number(t.minTicketUsdc),
          defaultLockupMonths: Number(t.defaultLockupMonths),
          lockupOptions: (t.lockupOptions ?? []).map(Number).filter((n) => n > 0),
          profiles: grid as OfferTerms['profiles'],
        }
      : null

  return (
    <DashboardShell>
      <DashboardHeader
        title="New offer"
        description="What is proposed to this client — the split here becomes their vault target once signed."
        kpis={[]}
      />

      <BentoGrid>
        <BentoCard span={8}>
          <OfferForm demo={demo} terms={terms} />
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
