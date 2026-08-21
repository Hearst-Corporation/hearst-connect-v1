'use client'

import {
  ActionOutcome,
  ConfirmField,
  KeeperMetricsFields,
  actionButtonClass,
} from '@/components/admin/forms/admin-action-form'
import clsx from 'clsx'
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
        className={clsx(actionButtonClass, 'w-full')}
      >
        {pending ? 'Sending…' : 'Report metrics'}
      </button>
      {outcome ? <ActionOutcome outcome={outcome} /> : null}
    </form>
  )
}
