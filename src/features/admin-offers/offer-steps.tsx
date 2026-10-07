'use client'

import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import { advanceOffer, type StepOutcome } from '@/features/admin-offers/actions'
import { SECONDARY_BUTTON } from '@/components/admin/paginated-table'
import { formatCurrency, formatDate } from '@/lib/format'
import type { OfferStatus } from '@/lib/offers/model'
import { useActionState } from 'react'

/**
 * LE GESTE SUIVANT D'UNE OFFRE — un seul, au bon moment.
 *
 * Le parcours, dans l'ordre du métier : envoyer la proposition, recueillir la
 * réponse du client, faire valider le KYC/AML par Sumsub, appeler les fonds,
 * constater leur arrivée, autoriser le dépôt, ouvrir le vault. Chaque étape
 * dit ce qu'il faut faire et pourquoi ; le backend refuse un saut d'étape, et
 * l'appel de fonds tant que le KYC/AML n'est pas validé.
 *
 * Chaque étape qui touche le client a son courriel (plus bas, dans
 * « Emails ») : on l'envoie, puis on consigne l'étape ici.
 */

export type OfferStepsOffer = Readonly<{
  id: string
  status: OfferStatus
  amountUsdc: number | null
  fundsReceivedAt?: string | null
}>

const ORDER: readonly OfferStatus[] = ['draft', 'sent', 'accepted', 'funding', 'funded', 'active']
const usd = (v: number | null) => (v === null ? '—' : formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 }))

function StepButton({
  offerId,
  to,
  label,
  by,
  secondary,
  disabled,
}: Readonly<{ offerId: string; to: string; label: string; by?: 'client' | 'admin'; secondary?: boolean; disabled?: boolean }>) {
  const [outcome, action, pending] = useActionState<StepOutcome | null, FormData>(advanceOffer, null)
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="by" value={by ?? 'admin'} />
      <button
        type="submit"
        disabled={pending || disabled}
        className={
          secondary
            ? SECONDARY_BUTTON
            : 'ud-cta inline-flex h-9 items-center disabled:cursor-not-allowed disabled:opacity-40'
        }
      >
        {pending ? 'Recording…' : label}
      </button>
      {outcome?.ok === false ? <p className="max-w-64 text-right text-xs text-amber-400">{outcome.error}</p> : null}
    </form>
  )
}

export function OfferSteps({
  offer,
  kyc,
  aml,
  depositDecisionId,
}: Readonly<{
  offer: OfferStepsOffer
  kyc: string | null
  aml: string | null
  /** La décision « dépôt à autoriser » quand les fonds sont arrivés. */
  depositDecisionId: string | null
}>) {
  if (!ORDER.includes(offer.status) || offer.status === 'active') return null
  const step = ORDER.indexOf(offer.status) + 1
  const cleared = (kyc ?? '').toUpperCase() === 'APPROVED' && (aml ?? 'CLEAR').toUpperCase() === 'CLEAR'

  const view = (() => {
    switch (offer.status) {
      case 'draft':
        return {
          title: 'Send the proposal',
          detail: 'Send the first email below with the PDF proposal, then record it here. Nothing reaches the client before.',
          actions: (
            <>
              <StepButton offerId={offer.id} to="expired" label="Withdraw" secondary />
              <StepButton offerId={offer.id} to="sent" label="Mark as sent" />
            </>
          ),
        }
      case 'sent':
        return {
          title: 'Waiting on the client’s answer',
          detail: 'The client accepts or declines from the proposal link. If they answer by email or on a call, record it here.',
          actions: (
            <>
              <StepButton offerId={offer.id} to="declined" label="Client declined" secondary />
              <StepButton offerId={offer.id} to="accepted" label="Client accepted" />
            </>
          ),
        }
      case 'accepted':
        return cleared
          ? {
              title: 'Call the funds',
              detail: 'KYC and AML are cleared by Sumsub. Send the funding email below — it carries the client’s Fireblocks deposit address — and the step records itself.',
              actions: <StepButton offerId={offer.id} to="funding" label="Funding link sent" />,
            }
          : {
              title: 'KYC & AML with Sumsub',
              detail: `KYC ${kyc === null ? 'not started' : kyc.toLowerCase().replace('_', ' ')} · AML ${aml === null ? 'not run' : aml.toLowerCase()}. Funds cannot be called until Sumsub clears both — the decision belongs to the partner, not to the console.`,
              actions: <StepButton offerId={offer.id} to="funding" label="Funding link sent" disabled />,
            }
      case 'funding':
        return offer.fundsReceivedAt
          ? {
              title: 'Authorise the deposit',
              detail: `${usd(offer.amountUsdc)} USDC received ${formatDate(offer.fundsReceivedAt)}. Authorising it lets the vault open.`,
              actions: depositDecisionId ? <DecisionButtons id={depositDecisionId} action="Authorise" /> : null,
            }
          : {
              title: 'Waiting for the transfer',
              detail: 'The client wires the USDC to the funding link. In production the transfer is detected on-chain; record it when it lands.',
              actions: <StepButton offerId={offer.id} to="funds_received" label="Funds received" />,
            }
      case 'funded':
        return {
          title: 'Open the vault',
          detail:
            'Send the last email (their access), then open the vault: the deposit is converted into bitcoin at today’s price and the machines its mining pocket buys are allocated.',
          actions: <StepButton offerId={offer.id} to="active" label="Open the vault" />,
        }
      default:
        return null
    }
  })()
  if (view === null) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--ud-radius-sm)] bg-[var(--hearst-green)]/[0.06] px-5 py-4 ring-1 ring-[var(--hearst-green)]/30">
      <div className="flex min-w-0 max-w-xl flex-col gap-1">
        <p className="text-xs tracking-[0.12em] text-[var(--hearst-green)] uppercase">
          Next step · {step} of {ORDER.length - 1}
        </p>
        <p className="text-base font-medium text-fg">{view.title}</p>
        <p className="text-xs text-fg-secondary">{view.detail}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-start justify-end gap-2">{view.actions}</div>
    </div>
  )
}
