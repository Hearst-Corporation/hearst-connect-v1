'use client'

import { Button } from '@hearst/ui/catalyst/button'
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
      <Button
        type="submit"
        disabled={pending}
        color="accent"
        className="w-full"
      >
        {pending ? 'Approving…' : 'Approve distribution'}
      </Button>
      {outcome?.ok === false ? (
        <p className="text-xs text-(--ds-danger)">{outcome.error}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-(--ds-success)">Distribution approved.</p>
      ) : null}
    </form>
  )
}
