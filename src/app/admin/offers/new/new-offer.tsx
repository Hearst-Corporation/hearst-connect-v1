import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Callout } from '@/components/compositions'
import { loadDemoState } from '@/features/demo/load'
import { loadSettings } from '@/lib/settings/load'
import type { OfferPreset, OfferTerms } from './offer-form'
import { requireSession } from '@/lib/auth'
import { BUFFER_PCT, MINING_PCT } from '@/lib/deposit-split'
import { OfferForm } from './offer-form'

/** Le formulaire, pré-rempli de ce que l'appelant sait du client (`/admin/clients/cli_2/new-offer`). */
export async function renderNewOffer(given?: OfferPreset) {
  await requireSession()
  // Sur le backend de démonstration, le formulaire arrive rempli : on présente, on ne saisit pas.
  const [demoState, settings] = await Promise.all([loadDemoState(), loadSettings()])
  const demo = demoState !== null
  // Démo : le prospect de la visite guidée, lu côté serveur — plus de `?client=` dans l'adresse.
  const preset: OfferPreset | undefined = given ?? (demoState?.tour ? { client: demoState.tour.clientName } : undefined)
  // Les termes en vigueur — ceux qu'un changement approuvé a fixés, délai passé.
  const t = settings?.values.terms as { minTicketUsdc?: number; defaultLockupMonths?: number; lockupOptions?: string[] } | undefined
  const terms: OfferTerms | null = t
    ? {
        minTicketUsdc: Number(t.minTicketUsdc),
        defaultLockupMonths: Number(t.defaultLockupMonths),
        lockupOptions: (t.lockupOptions ?? []).map(Number).filter((n) => n > 0),
      }
    : null

  return (
    <DashboardShell>
      <DashboardHeader
        title="New offer"
        description="What is proposed to this client — an amount and a lockup. The deposit becomes computing power and an electricity buffer."
        kpis={[]}
      />

      <BentoGrid>
        <BentoCard span={8}>
          <OfferForm demo={demo} terms={terms} preset={preset} />
        </BentoCard>

        <BentoCard span={4}>
          <div className="flex flex-col gap-4">
            <Callout tone="info" title="Mining as a Service">
              The deposit buys computing power in Hearst’s pool ({MINING_PCT} %) and keeps an electricity buffer in USDC
              ({BUFFER_PCT} %). Everything mined goes to the client’s bitcoin reserve; the bills are paid from the buffer.
              Nothing to allocate, nothing to rebalance.
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
