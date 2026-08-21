'use client'

import { actionButtonClass } from '@/components/admin/forms/admin-action-form'
import { payElectricity, type PayElectricityOutcome } from '@/lib/mining/actions'
import clsx from 'clsx'
import { useActionState } from 'react'

export function PayElectricityButton({
  amount,
}: Readonly<{ amount: string }>) {
  const [outcome, action, pending] = useActionState<PayElectricityOutcome | null, FormData>(
    payElectricity,
    null,
  )

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="amount" value={amount} />
      <button
        type="submit"
        disabled={pending}
        className={clsx(actionButtonClass, 'w-full')}
      >
        {pending ? 'Processing…' : 'Pay electricity'}
      </button>
      {outcome?.ok === false ? (
        <p className="text-xs text-danger-400">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-success-400">Payment recorded.</p>
      ) : null}
    </form>
  )
}
