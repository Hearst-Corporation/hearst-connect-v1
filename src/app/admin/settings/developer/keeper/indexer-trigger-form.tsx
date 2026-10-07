'use client'

import { surfaceInset } from '@/components/admin/surface'
import { ActionOutcome, ConfirmField } from '@/components/admin/forms/admin-action-form'
import { Button } from '@/components/catalyst/button'
import { Text } from '@/components/catalyst/text'
import { triggerIndexer, type IndexerTriggerOutcome } from '@/lib/backend/indexer-trigger'
import clsx from 'clsx'
import { useActionState } from 'react'

const INITIAL: IndexerTriggerOutcome = {
  ok: false,
  problem: null,
  stateReason: null,
  detail: null,
  trace: null,
  validationError: null,
}

/**
 * Admin-only control to POST /api/v1/admin/indexer/trigger.
 * Typed CONFIRM — same fail-closed contract as every other write form.
 */
export function IndexerTriggerForm() {
  const [state, action, pending] = useActionState(triggerIndexer, INITIAL)

  return (
    <form action={action} className="space-y-3">
      <Text>
        Reads the chain once more and indexes what is new. If the chain RPC is down, the failure is
        shown here as the service reports it.
      </Text>
      <ConfirmField />
      <Button type="submit" disabled={pending}>
        {pending ? 'Triggering…' : 'Run indexer'}
      </Button>
      <ActionOutcome outcome={state} />
      {state.ok ? (
        <pre className={clsx(surfaceInset, 'overflow-x-auto p-3 text-xs/5 text-fg')}>
          {state.detail ?? 'OK'}
        </pre>
      ) : null}
    </form>
  )
}
