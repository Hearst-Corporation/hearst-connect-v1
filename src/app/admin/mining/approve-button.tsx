'use client'

import { approveDistribution, type ApproveOutcome } from '@/lib/mining/actions'
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
        className="w-full rounded-lg bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
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
