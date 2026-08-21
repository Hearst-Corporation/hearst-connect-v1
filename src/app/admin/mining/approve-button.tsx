'use client'

import { actionButtonClass } from '@/components/admin/forms/admin-action-form'
import { approveDistribution, type ApproveOutcome } from '@/lib/mining/actions'
import clsx from 'clsx'
import { useActionState } from 'react'

export function ApproveButton({ distributionId }: Readonly<{ distributionId: string }>) {
  const [outcome, action, pending] = useActionState<ApproveOutcome | null, FormData>(
    approveDistribution,
    null,
  )

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="distributionId" value={distributionId} />
      <button
        type="submit"
        disabled={pending}
        className={clsx(actionButtonClass, 'w-full')}
      >
        {pending ? 'Approving…' : 'Approve distribution'}
      </button>
      {outcome?.ok === false ? (
        <p className="text-xs text-danger-400">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-success-400">Distribution approved.</p>
      ) : null}
    </form>
  )
}
