'use client'

import { releaseVault, type StepOutcome } from '@/features/admin-offers/actions'
import { useActionState } from 'react'

/** Lever le blocage arrivé à terme : la réserve repart chez le client, en bitcoin. */
export function ReleaseVaultButton({ vaultId }: Readonly<{ vaultId: string }>) {
  const [outcome, action, pending] = useActionState<StepOutcome | null, FormData>(releaseVault, null)
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="vaultId" value={vaultId} />
      <button type="submit" disabled={pending} className="ud-cta inline-flex h-9 items-center disabled:opacity-40">
        {pending ? 'Releasing…' : 'Release the reserve'}
      </button>
      {outcome?.ok === false ? <p className="max-w-64 text-right text-xs text-amber-400">{outcome.error}</p> : null}
    </form>
  )
}
