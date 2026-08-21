'use client'

import { surfaceBox } from '@/components/admin/surface'
import {
  ActionOutcome,
  ConfirmField,
  actionFieldClass,
} from '@/components/admin/forms/admin-action-form'
import { StatusBadge } from '@/components/admin/truthful'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import clsx from 'clsx'
import { useActionState } from 'react'

/**
 * Keeper action form — fail-closed.
 *
 * The operator must type "CONFIRM": no isolated click triggers a call.
 * Until the backend has responded, nothing is presented as executed, and
 * no transaction hash is ever displayed.
 */
function KeeperActionFields({ needsMetrics }: Readonly<{ needsMetrics: boolean }>) {
  return (
    <>
      {needsMetrics ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-fg-tertiary dark:text-fg-secondary">hashrateTh — integer ≥ 0</span>
            <input name="hashrateTh" type="number" min={0} step={1} required className={actionFieldClass} />
          </label>
          <label className="block">
            <span className="text-xs text-fg-tertiary dark:text-fg-secondary">btcEarnedSats — integer ≥ 0</span>
            <input name="btcEarnedSats" type="number" min={0} step={1} required className={actionFieldClass} />
          </label>
        </div>
      ) : null}

      <ConfirmField />
    </>
  )
}

function KeeperOutcomePanel({ outcome }: Readonly<{ outcome: KeeperOutcome }>) {
  if (outcome.validationError) {
    return (
      <div className="mt-4 border-t border-ink/5 pt-4 dark:border-console-line-soft">
        <p className="text-xs text-warning-400">{outcome.validationError}</p>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-ink/5 pt-4 dark:border-console-line-soft">
      <p className="text-xs text-fg-tertiary dark:text-fg-secondary">
        Backend response:{' '}
        <span className="font-mono text-ink dark:text-fg">{outcome.result?.status ?? '—'}</span>
      </p>
      {outcome.result?.reason ? (
        <p className="mt-1 font-mono text-xs text-fg-tertiary dark:text-fg-secondary">reason: {outcome.result.reason}</p>
      ) : null}
      <ActionOutcome outcome={outcome} keeper={outcome.result} />
    </div>
  )
}

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
          <h2 className="text-sm font-semibold text-ink dark:text-fg">{endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-fg-tertiary dark:text-fg-secondary">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <StatusBadge status={disabled ? 'NOT_CONFIGURED' : 'LIVE'} />
      </div>

      {endpoint.caveat ? (
        <p className="mt-3 rounded-lg bg-warning-400/10 px-3 py-2 text-xs text-warning-400 ring-1 ring-warning-400/20">
          {endpoint.caveat}
        </p>
      ) : null}

      {disabled ? (
        <p className="mt-4 border-t border-console-line-soft pt-3 text-xs text-fg-secondary">
          {disabledReason}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          <KeeperActionFields needsMetrics={needsMetrics} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent-400 px-3 py-1.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            {pending ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}

      {outcome ? <KeeperOutcomePanel outcome={outcome} /> : null}
    </section>
  )
}
