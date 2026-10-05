'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { payElectricity, type PayElectricityOutcome } from '@/lib/mining/actions'
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
      <Button
        type="submit"
        disabled={pending}
        color="accent"
        className="w-full"
      >
        {pending ? 'Processing…' : 'Pay electricity'}
      </Button>
      {outcome?.ok === false ? (
        <p className="text-xs text-(--ds-danger)">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-(--ds-success)">Payment recorded.</p>
      ) : null}
    </form>
  )
}
