'use client'

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
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        {pending ? 'Sending…' : 'Report metrics'}
      </button>
      {outcome ? <ActionOutcome outcome={outcome} /> : null}
    </form>
  )
}
