'use client'

import { surfaceInset } from '@/components/admin/surface'
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
 * Explicit CONFIRM required — mirrors Keeper fail-closed pattern.
 */
export function IndexerTriggerForm() {
  const [state, action, pending] = useActionState(triggerIndexer, INITIAL)

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="confirm" value="CONFIRM" />
      <Text>
        Starts one Series 1 indexer pass. Useful only when chain RPC is reachable — otherwise the
        failure stays visible in the response. This does not sign vault transactions.
      </Text>
      <Button type="submit" disabled={pending} color="dark/neutral">
        {pending ? 'Triggering…' : 'Run indexer'}
      </Button>
      {state.validationError ? (
        <Text className="text-danger-400">{state.validationError}</Text>
      ) : null}
      {state.stateReason ? (
        <Text className="text-warning-400">{state.stateReason}</Text>
      ) : null}
      {state.problem ? (
        <Text className="text-warning-400">
          {state.problem.title}
          {state.problem.detail ? ` — ${state.problem.detail}` : ''}
        </Text>
      ) : null}
      {state.ok ? (
        <pre className={clsx(surfaceInset, 'overflow-x-auto p-3 text-xs/5 text-fg')}>
          {state.detail ?? 'OK'}
        </pre>
      ) : null}
    </form>
  )
}
