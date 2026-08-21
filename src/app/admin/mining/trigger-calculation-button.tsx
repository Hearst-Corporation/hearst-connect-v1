'use client'

import { actionButtonClass } from '@/components/admin/forms/admin-action-form'
import { triggerCalculation, type TriggerCalculationOutcome } from '@/lib/mining/actions'
import clsx from 'clsx'
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
        className={clsx(actionButtonClass, 'w-full')}
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
