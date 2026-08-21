import { surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata } from '@/components/admin/truthful'
import { Text } from '@/components/catalyst/text'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import clsx from 'clsx'

/**
 * Shared plumbing for every admin write form.
 * One field treatment, one typed CONFIRM, one outcome renderer.
 */

export const actionFieldClass = clsx(
  surfaceInset,
  'mt-1 w-full px-2 py-1.5 text-sm text-ink dark:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
)

/** Fail-closed: the operator types CONFIRM. No isolated click fires a write. */
export function ConfirmField() {
  return (
    <label className="block">
      <span className="text-xs text-fg-tertiary dark:text-fg-secondary">
        Type <span className="font-mono text-warning-400">CONFIRM</span> to send the request
      </span>
      <input
        name="confirm"
        type="text"
        autoComplete="off"
        placeholder="CONFIRM"
        className={clsx(actionFieldClass, 'font-mono sm:max-w-xs')}
      />
    </label>
  )
}

export function KeeperMetricsFields() {
  return (
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
  )
}

export type ActionOutcomeState = Readonly<{
  validationError: string | null
  stateReason: string | null
  problem: Problem | null
  trace: CallTrace | null
  result?: KeeperActionResult | null
}>

/**
 * One truthful outcome block. Severity order: validation → source state →
 * HTTP problem → keeper result (status/reason/detail once) → call trace.
 * Success chrome stays on the form.
 */
export function ActionOutcome({ outcome }: Readonly<{ outcome: ActionOutcomeState }>) {
  const result = outcome.result ?? null
  return (
    <>
      {outcome.validationError ? (
        <Text className="text-danger-400">{outcome.validationError}</Text>
      ) : null}
      {outcome.stateReason ? (
        <Text className="text-warning-400">{outcome.stateReason}</Text>
      ) : null}
      {outcome.problem ? <ProblemState problem={outcome.problem} /> : null}
      {result ? (
        <p className="font-mono text-xs text-fg-tertiary dark:text-fg-secondary">
          Backend response: <span className="text-ink dark:text-fg">{result.status}</span>
          {result.reason ? ` · ${result.reason}` : ''}
          {result.detail ? ` — ${result.detail}` : ''}
        </p>
      ) : null}
      {outcome.trace ? (
        <div className="mt-2">
          <RequestMetadata trace={outcome.trace} />
        </div>
      ) : null}
    </>
  )
}
