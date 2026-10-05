'use client'

import { Button } from '@hearst/ui/catalyst/button'
import {
  ActionOutcome,
  ConfirmField,
  KeeperMetricsFields,
} from '@/components/admin/forms/admin-action-form'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import { useActionState } from 'react'

export function ReportMetricsButton() {
  const [outcome, action, pending] = useActionState<KeeperOutcome | null, FormData>(
    runKeeperAction,
    null,
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="endpointId" value="keeper-mining-report" />
      <KeeperMetricsFields />
      <ConfirmField />
      <Button
        type="submit"
        disabled={pending}
        color="accent"
        className="w-full"
      >
        {pending ? 'Sending…' : 'Report metrics'}
      </Button>
      {outcome ? <ActionOutcome outcome={outcome} /> : null}
    </form>
  )
}
