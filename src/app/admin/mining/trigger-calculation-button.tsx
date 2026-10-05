'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { triggerCalculation, type TriggerCalculationOutcome } from '@/lib/mining/actions'
import { useActionState } from 'react'

export function TriggerCalculationButton({
  period,
  rwaStrategyId,
}: Readonly<{ period: string; rwaStrategyId: string }>) {
  const [outcome, action, pending] = useActionState<TriggerCalculationOutcome | null, FormData>(
    triggerCalculation,
    null,
  )

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="rwaStrategyId" value={rwaStrategyId} />
      <Button
        type="submit"
        disabled={pending}
        color="accent"
        className="w-full"
      >
        {pending ? 'Triggering…' : 'Trigger calculation'}
      </Button>
      {outcome?.ok === false ? (
        <p className="text-xs text-(--ds-danger)">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-(--ds-success)">Calculation triggered.</p>
      ) : null}
    </form>
  )
}
