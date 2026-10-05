import { surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata } from '@/components/admin/truthful'
import { Text } from '@hearst/ui/catalyst/text'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import clsx from 'clsx'

/**
 * Shared plumbing for every admin write form.
 * One field treatment, one typed CONFIRM, one outcome renderer.
 */

export const actionFieldClass = clsx(
  surfaceInset,
  'mt-1 w-full px-2 py-1.5 text-sm text-(--ds-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ds-focus)',
)

/** Fail-closed: the operator types CONFIRM. No isolated click fires a write. */
export function ConfirmField() {
  return (
    <label className="block">
      <span className="text-xs text-(--ds-text-subtle)">
        Type <span className="font-mono text-(--ds-warning)">CONFIRM</span> to send the request
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
        <span className="text-xs text-(--ds-text-subtle)">hashrateTh — integer ≥ 0</span>
        <input name="hashrateTh" type="number" min={0} step={1} required className={actionFieldClass} />
      </label>
      <label className="block">
        <span className="text-xs text-(--ds-text-subtle)">btcEarnedSats — integer ≥ 0</span>
        <input name="btcEarnedSats" type="number" min={0} step={1} required className={actionFieldClass} />
      </label>
    </div>
  )
}

/** Body fields for the keeper endpoints whose contract requires them. */
export function KeeperBodyFields({ endpointId }: Readonly<{ endpointId: string }>) {
  if (endpointId === 'mining-distribution-approve') {
    return (
      <label className="block">
        <span className="text-xs text-(--ds-text-subtle)">id — distribution identifier</span>
        <input name="id" type="text" required className={actionFieldClass} />
      </label>
    )
  }
  if (endpointId === 'mining-calculation-trigger') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-(--ds-text-subtle)">period — YYYY-MM</span>
          <input name="period" type="text" pattern="\d{4}-\d{2}" placeholder="2026-08" required className={actionFieldClass} />
        </label>
        <label className="block">
          <span className="text-xs text-(--ds-text-subtle)">rwaStrategyId</span>
          <input name="rwaStrategyId" type="text" required className={actionFieldClass} />
        </label>
      </div>
    )
  }
  if (endpointId === 'keeper-rwa-vault') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-(--ds-text-subtle)">action</span>
          <select name="action" required className={actionFieldClass}>
            <option value="deposit">deposit</option>
            <option value="withdraw">withdraw</option>
            <option value="deposit_yield">deposit_yield</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-(--ds-text-subtle)">amount — base units, integer string</span>
          <input name="amount" type="text" pattern="(0|[1-9][0-9]*)" required className={actionFieldClass} />
        </label>
      </div>
    )
  }
  return null
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
        <Text className="text-(--ds-danger)">{outcome.validationError}</Text>
      ) : null}
      {outcome.stateReason ? (
        <Text className="text-(--ds-warning)">{outcome.stateReason}</Text>
      ) : null}
      {outcome.problem ? <ProblemState problem={outcome.problem} /> : null}
      {result ? (
        <p className="font-mono text-xs text-(--ds-text-subtle)">
          Backend response: <span className="text-(--ds-text)">{result.status}</span>
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
