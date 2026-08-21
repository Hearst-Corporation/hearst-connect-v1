'use client'

import { surfaceBox } from '@/components/admin/surface'
import {
  ActionOutcome,
  ConfirmField,
  KeeperMetricsFields,
} from '@/components/admin/forms/admin-action-form'
import { StatusBadge } from '@/components/admin/truthful'
import { Callout } from '@/components/compositions'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import clsx from 'clsx'
import { useActionState } from 'react'

/**
 * Keeper action form — fail-closed. Nothing is presented as executed until
 * the backend responds. No transaction hash is displayed here.
 */
export function KeeperForm({
  endpoint,
  disabled,
  disabledReason,
}: Readonly<{ endpoint: BackendEndpoint; disabled: boolean; disabledReason: string | null }>) {
  const [outcome, formAction, pending] = useActionState<KeeperOutcome | null, FormData>(runKeeperAction, null)
  const needsMetrics = endpoint.id === 'keeper-mining-report'

  return (
    <section className={clsx(surfaceBox, 'p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">{endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-fg-secondary">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <StatusBadge status={disabled ? 'NOT_CONFIGURED' : 'LIVE'} />
      </div>

      {endpoint.caveat ? (
        <Callout tone="warning" className="mt-3 text-xs">
          {endpoint.caveat}
        </Callout>
      ) : null}

      {disabled ? (
        <p className="mt-4 border-t border-console-line-soft pt-3 text-xs text-fg-secondary">
          {disabledReason}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {needsMetrics ? <KeeperMetricsFields /> : null}
          <ConfirmField />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent-400 px-3 py-1.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            {pending ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}

      {outcome ? (
        <div className="mt-4 border-t border-console-line-soft pt-4">
          <ActionOutcome outcome={outcome} />
        </div>
      ) : null}
    </section>
  )
}
