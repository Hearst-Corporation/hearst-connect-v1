'use client'

import { useActionState } from 'react'
import { decideApproval, type DecisionOutcome } from './actions'

/**
 * Approuver ou refuser UN élément. Les deux boutons partagent un formulaire :
 * le bouton cliqué porte la décision. Une fois décidé, l'élément quitte la file.
 */
export function DecisionButtons({ id, action }: Readonly<{ id: string; action: string }>) {
  const [outcome, submit, pending] = useActionState<DecisionOutcome | null, FormData>(decideApproval, null)
  if (outcome?.ok) {
    return (
      <span className="text-xs text-fg-tertiary">{outcome.decision === 'decline' ? 'Declined' : 'Approved'}</span>
    )
  }
  return (
    <form action={submit} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <button type="submit" name="decision" value="approve" disabled={pending} className="ud-cta">
          {pending ? '…' : action}
        </button>
        <button
          type="submit"
          name="decision"
          value="decline"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-full px-5 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
        >
          Decline
        </button>
      </div>
      {outcome?.ok === false ? <span className="text-[11px] text-danger-400">{outcome.error}</span> : null}
    </form>
  )
}
