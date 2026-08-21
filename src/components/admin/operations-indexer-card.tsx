'use client'

import { DashCard } from '@/components/admin/dashboard'
import { Button } from '@/components/catalyst/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/components/catalyst/dialog'
import { ActionOutcome } from '@/components/admin/forms/admin-action-form'
import { triggerIndexer, type IndexerTriggerOutcome } from '@/lib/backend/indexer-trigger'
import { useActionState, useState } from 'react'

const INITIAL: IndexerTriggerOutcome = {
  ok: false,
  problem: null,
  stateReason: null,
  detail: null,
  trace: null,
  validationError: null,
}

function indexerLabel(status: string | null | undefined): string {
  if (status === null || status === undefined || status === '') return 'Unavailable'
  const key = status.trim().toUpperCase()
  if (key === 'LIVE' || key === 'INDEXED' || key === 'UP_TO_DATE' || key === 'OK') return 'Up to date'
  if (key === 'STALE' || key === 'LAG' || key === 'BEHIND') return 'Needs refresh'
  if (key === 'RUNNING' || key === 'INDEXING') return 'Running'
  if (key === 'NOT_CONFIGURED' || key === 'NOT_SUPPORTED') return 'Not configured'
  if (key === 'PERMISSION_DENIED') return 'Not authorized'
  if (key === 'UNAVAILABLE' || key === 'ERROR') return 'Unavailable'
  return status
}

/**
 * Operational indexer control — POST /api/v1/admin/indexer/trigger.
 * Requires an explicit confirmation dialog. Does not sign chain transactions.
 */
export function OperationsIndexerCard({
  indexerStatus,
}: Readonly<{ indexerStatus: string | null | undefined }>) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(triggerIndexer, INITIAL)

  return (
    <div data-widget="operations-indexer" className="min-w-0">
      <DashCard title="Indexer">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-fg-tertiary">Status: {indexerLabel(indexerStatus)}</p>
            <p className="mt-2 text-sm text-fg-secondary">
              Refresh indexed blockchain activity. This does not sign or submit vault transactions.
            </p>
          </div>

          <div>
            <Button type="button" color="dark/neutral" onClick={() => setOpen(true)} disabled={pending}>
              {pending ? 'Running…' : 'Run indexer'}
            </Button>
          </div>

          <Dialog open={open} onClose={setOpen} size="md">
            <DialogTitle>Run indexer?</DialogTitle>
            <DialogDescription>
              This starts one Series 1 indexer pass against the configured vault. It will not execute
              a rebalance or sign any transaction. If chain RPC is unreachable, the server will return
              a visible failure.
            </DialogDescription>
            <DialogBody>
              <p className="text-sm text-fg-tertiary">
                Continue only if you intend to refresh indexed activity.
              </p>
            </DialogBody>
            <DialogActions>
              <Button plain type="button" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <form
                action={action}
                onSubmit={() => {
                  setOpen(false)
                }}
              >
                <input type="hidden" name="confirm" value="CONFIRM" />
                <Button type="submit" color="dark/neutral" disabled={pending}>
                  {pending ? 'Running…' : 'Confirm run'}
                </Button>
              </form>
            </DialogActions>
          </Dialog>

          <ActionOutcome outcome={state} />
          {state.ok ? (
            <pre className="max-h-40 overflow-auto border-t border-console-line-soft pt-2 font-mono text-xs/5 text-fg scrollbar-none">
              {state.detail ?? 'OK'}
            </pre>
          ) : null}
        </div>
      </DashCard>
    </div>
  )
}
