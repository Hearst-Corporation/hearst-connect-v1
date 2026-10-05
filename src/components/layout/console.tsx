import { backendStateFrom, backendStateLabel } from '@/lib/backend/reading-state'
import { readableReason } from '@/lib/movements'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'
import { AdminToneBadge, toneForBackendState } from '@/components/admin/status-tone'
import clsx from 'clsx'

export const metricValue = 'text-[0.9375rem]/[1.3] font-semibold tabular-nums wrap-anywhere text-(--ds-text)'

/**
 * A named absence: the state in words, then a readable reason when we have
 * one, else the endpoint that would answer. Never a raw snake_case reason code.
 * `onAccent` darkens the ink on the mint card.
 */
function Absent({
  availability,
  onAccent = false,
  showRoute = false,
}: Readonly<{ availability: Availability<unknown>; onAccent?: boolean; showRoute?: boolean }>) {
  if (isAvailable(availability)) return null
  const { reason, endpoint, status } = availability
  const readableMotif = readableReason(reason)
  const detail = [readableMotif, endpoint].filter((part): part is string => part !== null && part !== undefined && part !== '')
  const detailLine = detail.join(' · ')
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className={clsx('text-[0.8125rem]/5', onAccent ? 'text-(--ds-accent-text)/72' : 'text-(--ds-text-subtle)')}>
        {status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'}
      </span>
      {showRoute && detailLine !== '' && (
        <span className={clsx('block text-[0.8125rem]/5 wrap-anywhere', onAccent ? 'text-(--ds-accent-text)/72' : 'text-(--ds-shell-subtle)')}>
          {detailLine}
        </span>
      )}
    </span>
  )
}

/**
 * A reading, or its absence — the only way a figure reaches the screen in this
 * composition. There is no third branch and no default value, which is what
 * makes "a count nobody can make never renders as zero" structural here rather
 * than a habit.
 */
export function Reading({
  value,
  className,
  onAccent = false,
  showRoute = false,
}: Readonly<{
  value: Availability<string>
  className?: string
  onAccent?: boolean
  showRoute?: boolean
}>) {
  if (!isAvailable(value)) return <Absent availability={value} onAccent={onAccent} showRoute={showRoute} />
  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <span className={clsx(metricValue, className)}>{value.value}</span>
  }
  const state = backendStateFrom(value)
  return (
    <span className="inline-flex items-center gap-2">
      <span className={clsx(metricValue, className)}>{value.value}</span>
      <AdminToneBadge
        tone={toneForBackendState(state)}
        showDot={state === 'LIVE'}
        data-live-badge={state === 'LIVE' ? '' : undefined}
        data-state-badge={state === 'LIVE' ? undefined : ''}
      >
        {backendStateLabel(state)}
      </AdminToneBadge>
    </span>
  )
}

