import { surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata } from '@/components/admin/truthful'
import { Text } from '@/components/catalyst/text'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import clsx from 'clsx'

/**
 * Shared plumbing for admin action forms (create-client, keeper, indexer
 * trigger) — one field treatment, one fail-closed CONFIRM block, one truthful
 * outcome rendering. Each form keeps its own action and success presentation.
 */

/** Inset field treatment — inputs and selects of every admin action form. */
export const actionFieldClass = clsx(
  surfaceInset,
  'mt-1 w-full px-2 py-1.5 text-sm text-ink dark:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
)

/**
 * Fail-closed guard: no isolated click triggers a write — the operator types
 * the CONFIRM literal.
 */
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

/** Common shape of every admin action outcome (validation → state → problem → trace). */
export type ActionOutcomeState = Readonly<{
  validationError: string | null
  stateReason: string | null
  problem: Problem | null
  trace: CallTrace | null
}>

/**
 * Truthful outcome block — renders exactly what the backend returned, in
 * severity order: local validation, source state, problem detail, call trace.
 * Success presentation stays owned by each form.
 */
export function ActionOutcome({
  outcome,
  keeper = null,
}: Readonly<{ outcome: ActionOutcomeState; keeper?: KeeperActionResult | null }>) {
  return (
    <>
      {outcome.validationError ? (
        <Text className="text-danger-400">{outcome.validationError}</Text>
      ) : null}
      {outcome.stateReason ? (
        <Text className="text-warning-400">{outcome.stateReason}</Text>
      ) : null}
      {outcome.problem || keeper ? (
        <ProblemState problem={outcome.problem} keeper={keeper} />
      ) : null}
      {outcome.trace ? (
        <div className="mt-2">
          <RequestMetadata trace={outcome.trace} />
        </div>
      ) : null}
    </>
  )
}
