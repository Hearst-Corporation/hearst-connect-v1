'use client'

import { advanceOffer, type StepOutcome } from '@/features/admin-offers/actions'
import { useActionState } from 'react'

/** Un bouton de réponse du client, aux couleurs de la proposition. */
export function AnswerButton({
  offerId,
  to,
  label,
  primary,
}: Readonly<{ offerId: string; to: 'accepted' | 'declined'; label: string; primary?: boolean }>) {
  const [outcome, action, pending] = useActionState<StepOutcome | null, FormData>(advanceOffer, null)
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="by" value="client" />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-medium disabled:opacity-50 ${
          primary ? 'bg-[#9eea7a] text-[#06140a] hover:bg-[#b4f294]' : 'text-white ring-1 ring-white/25 hover:bg-white/10'
        }`}
      >
        {pending ? 'Sending…' : label}
      </button>
      {outcome?.ok === false ? <p className="text-xs text-amber-300">{outcome.error}</p> : null}
    </form>
  )
}
