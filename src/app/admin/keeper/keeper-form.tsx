'use client'

import { surfaceBox, surfaceInset } from '@/components/admin/surface'
import {
  ActionOutcome,
  ConfirmField,
  KeeperBodyFields,
  KeeperMetricsFields,
  actionButtonClass,
} from '@/components/admin/forms/admin-action-form'
import { StatusBadge } from '@/components/admin/truthful'
import { Callout } from '@/components/compositions'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import clsx from 'clsx'
import { useActionState } from 'react'

/* FROZEN BOX: 340px holds the tallest idle state (mining-report = caveat +
   metrics pair + CONFIRM + button ≈ 326px chrome included) without scrolling;
   the outcome well and any longer state scroll INSIDE — the grid row never
   moves with the data. */
const CARD_HEIGHT_CLASS = 'h-[340px]'

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
    <section
      data-surface="box"
      className={clsx(surfaceBox, 'flex min-w-0 flex-col p-5', CARD_HEIGHT_CLASS)}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">{endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-fg-secondary">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <StatusBadge status={disabled ? 'NOT_CONFIGURED' : 'LIVE'} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-none">
        {endpoint.caveat ? (
          <Callout tone="warning" className="text-xs">
            {endpoint.caveat}
          </Callout>
        ) : null}

        {disabled ? (
          <p className={clsx(surfaceInset, 'p-3 text-xs text-fg-secondary')}>{disabledReason}</p>
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="endpointId" value={endpoint.id} />
            {needsMetrics ? <KeeperMetricsFields /> : null}
            <KeeperBodyFields endpointId={endpoint.id} />
            <ConfirmField />
            <button
              type="submit"
              disabled={pending}
              className={actionButtonClass}
            >
              {pending ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}

        {outcome ? (
          <div className={clsx(surfaceInset, 'p-3')}>
            <ActionOutcome outcome={outcome} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
