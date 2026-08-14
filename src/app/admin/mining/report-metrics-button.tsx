'use client'

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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-fg-tertiary">Hashrate (TH/s)</span>
          <input
            name="hashrateTh"
            type="number"
            min={0}
            step={1}
            required
            className="mt-1 w-full rounded-lg bg-console-inset px-2 py-1.5 text-sm text-ink dark:text-fg ring-1 ring-console-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          />
        </label>
        <label className="block">
          <span className="text-xs text-fg-tertiary">BTC earned (sats)</span>
          <input
            name="btcEarnedSats"
            type="number"
            min={0}
            step={1}
            required
            className="mt-1 w-full rounded-lg bg-console-inset px-2 py-1.5 text-sm text-ink dark:text-fg ring-1 ring-console-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-fg-tertiary">
          Type <span className="font-mono text-warning-400">CONFIRM</span> to send
        </span>
        <input
          name="confirm"
          type="text"
          autoComplete="off"
          placeholder="CONFIRM"
          className="mt-1 w-full max-w-xs rounded-lg bg-console-inset px-2 py-1.5 text-sm font-mono text-ink dark:text-fg ring-1 ring-console-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        {pending ? 'Sending…' : 'Report metrics'}
      </button>
      {outcome?.validationError ? (
        <p className="text-xs text-warning-400">{outcome.validationError}</p>
      ) : outcome?.ok === false && outcome.stateReason ? (
        <p className="text-xs text-danger-400">{outcome.stateReason}</p>
      ) : outcome?.ok === true ? (
        <p className="text-xs text-success-400">
          Backend response: {outcome.result?.status ?? 'OK'}
        </p>
      ) : null}
    </form>
  )
}
