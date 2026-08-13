'use client'

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
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        {pending ? 'Triggering…' : 'Trigger calculation'}
      </button>
      {outcome?.ok === false ? (
        <p className="text-xs text-danger-400">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-success-400">Calculation triggered.</p>
      ) : null}
    </form>
  )
}
