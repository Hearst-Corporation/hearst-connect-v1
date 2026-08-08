'use server'

import { getSession } from '@/lib/session'
import { callBackend, type CallTrace, type Problem } from './client'
import { toBackendRole } from './auth'

export type IndexerTriggerOutcome = {
  ok: boolean
  problem: Problem | null
  stateReason: string | null
  detail: string | null
  trace: CallTrace | null
  validationError: string | null
}

/**
 * Triggers one Series 1 indexer run (admin only).
 * Requires explicit confirm=CONFIRM — no accidental POST.
 */
export async function triggerIndexer(
  _prev: IndexerTriggerOutcome | null,
  form: FormData,
): Promise<IndexerTriggerOutcome> {
  const base: IndexerTriggerOutcome = {
    ok: false,
    problem: null,
    stateReason: null,
    detail: null,
    trace: null,
    validationError: null,
  }

  if (form.get('confirm') !== 'CONFIRM') {
    return { ...base, validationError: 'Missing confirmation: no request was sent.' }
  }

  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ...base, validationError: 'Administrator role required to trigger the indexer.' }
  }

  const response = await callBackend<Record<string, unknown>>('admin-indexer-trigger', { body: {} })

  if (!response.ok) {
    return {
      ...base,
      problem: response.problem,
      stateReason: response.state.reason,
      trace: response.trace,
    }
  }

  let detail: string | null = null
  try {
    detail = JSON.stringify(response.data)
  } catch {
    detail = 'Response received (not serializable).'
  }

  return { ...base, ok: true, detail, trace: response.trace }
}
