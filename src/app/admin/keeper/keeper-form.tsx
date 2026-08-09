'use client'

import { surfaceBox, surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata, StatusBadge } from '@/components/admin/truthful'
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
  const fieldClass = clsx(
    surfaceInset,
    'mt-1 w-full px-2 py-1.5 text-sm text-ink dark:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
  )

  return (
    <>
      {needsMetrics ? (
        <div className="flex flex-wrap gap-3 *:flex-1 *:min-w-[12rem]">
          <label className="block">
            <span className="text-xs text-fg-tertiary dark:text-fg-secondary">hashrateTh — integer ≥ 0</span>
            <input name="hashrateTh" type="number" min={0} step={1} required className={fieldClass} />
          </label>
          <label className="block">
            <span className="text-xs text-fg-tertiary dark:text-fg-secondary">btcEarnedSats — integer ≥ 0</span>
            <input name="btcEarnedSats" type="number" min={0} step={1} required className={fieldClass} />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">
          Type <span className="font-mono text-warning-400">CONFIRM</span> to send the
          request
        </span>
        <input
          name="confirm"
          type="text"
          autoComplete="off"
          placeholder="CONFIRM"
          className={`${fieldClass} font-mono sm:max-w-xs`}
        />
      </label>
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
        <span className="font-mono text-ink dark:text-fg">
          {outcome.result?.status ?? outcome.stateReason ?? '—'}
        </span>
      </p>
      {outcome.result?.reason ? (
        <p className="mt-1 font-mono text-xs text-fg-tertiary dark:text-fg-secondary">reason: {outcome.result.reason}</p>
      ) : null}
      <ProblemState problem={outcome.problem} keeper={outcome.result} />
      {outcome.trace ? (
        <div className="mt-3">
          <RequestMetadata trace={outcome.trace} />
        </div>
      ) : null}
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
        <p className={clsx(surfaceInset, 'mt-4 px-3 py-2 text-xs text-fg-secondary')}>
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
