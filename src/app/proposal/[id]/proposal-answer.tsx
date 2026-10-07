import { AnswerButton } from './answer-button'
import { formatDate } from '@/lib/format'
import type { Offer } from '@/lib/offers/model'

/**
 * LA RÉPONSE DU CLIENT, sur la proposition qu'il a reçue.
 *
 * C'est le client qui accepte ou décline : la proposition porte donc ses deux
 * boutons tant qu'elle attend sa réponse. Une fois répondu, la bande dit ce qui
 * se passe ensuite. Masquée à l'impression : le PDF reste la proposition seule.
 */
export function ProposalAnswer({ offer }: Readonly<{ offer: Offer }>) {
  if (offer.status === 'draft') return null
  const answered = offer.status !== 'sent'
  return (
    <div className="proposal-answer">
      {answered ? (
        <p className="text-sm text-white/80">
          {offer.status === 'declined'
            ? `Declined${offer.decidedAt ? ` on ${formatDate(offer.decidedAt)}` : ''}.`
            : offer.status === 'expired'
              ? 'This proposal has expired.'
              : `Accepted${offer.decidedAt ? ` on ${formatDate(offer.decidedAt)}` : ''} — Hearst sends your credentials and the funding link once your KYC is cleared.`}
        </p>
      ) : (
        <>
          <p className="text-sm text-white/80">
            <span className="font-medium text-white">Your answer.</span> Accepting opens your onboarding — KYC with our
            partner, then the funding link.
          </p>
          <div className="flex flex-wrap items-start gap-2">
            <AnswerButton offerId={offer.id} to="declined" label="Decline" />
            <AnswerButton offerId={offer.id} to="accepted" label="Accept this proposal" primary />
          </div>
        </>
      )}
    </div>
  )
}
