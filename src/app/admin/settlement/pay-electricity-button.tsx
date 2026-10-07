'use client'

import { actionButtonClass } from '@/components/admin/forms/admin-action-form'
import { payElectricity, type PayElectricityOutcome } from '@/lib/mining/actions'
import { useActionState } from 'react'

export function PayElectricityButton({
  amount,
  vaultId,
  month,
  compact = false,
}: Readonly<{ amount: string; vaultId?: string; month?: string; compact?: boolean }>) {
  const [outcome, action, pending] = useActionState<PayElectricityOutcome | null, FormData>(
    payElectricity,
    null,
  )

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="amount" value={amount} />
      {vaultId ? <input type="hidden" name="vaultId" value={vaultId} /> : null}
      {month ? <input type="hidden" name="month" value={month} /> : null}
      <button
        type="submit"
        disabled={pending}
        className={compact ? 'inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5' : actionButtonClass}
      >
        {pending ? 'Processing…' : compact ? 'Pay' : 'Pay electricity'}
      </button>
      {outcome?.ok === false ? (
        <p className="text-xs text-danger-400">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-success-400">Sent to Fireblocks — awaiting signers.</p>
      ) : null}
    </form>
  )
}
