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
        Déclenche une passe de l’indexeur Series 1. Utile seulement si le RPC chaîne est joignable —
        sinon l’échec reste visible dans la réponse.
      </Text>
      <Button type="submit" disabled={pending} color="dark/zinc">
        {pending ? 'Triggering…' : 'Trigger indexer'}
      </Button>
      {state.validationError ? (
        <Text className="text-red-600 dark:text-red-400">{state.validationError}</Text>
      ) : null}
      {state.stateReason ? (
        <Text className="text-amber-700 dark:text-amber-400">{state.stateReason}</Text>
      ) : null}
      {state.problem ? (
        <Text className="text-amber-700 dark:text-amber-400">
          {state.problem.title}
          {state.problem.detail ? ` — ${state.problem.detail}` : ''}
        </Text>
      ) : null}
      {state.ok ? (
        <pre className={clsx(surfaceInset, 'overflow-x-auto p-3 text-xs/5 text-zinc-300')}>
          {state.detail ?? 'OK'}
        </pre>
      ) : null}
    </form>
  )
}
