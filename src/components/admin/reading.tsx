import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import { backendStateFrom, backendStateLabel } from '@/lib/backend/reading-state'
import { formatDateTime } from '@/lib/format'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Truthful reading of an `Availability` — Catalyst only.
 * Three backend states: Live · Offline · Issue.
 */
export function AdminReading({
  value,
  emptyLabel = 'Offline',
  compact = false,
}: Readonly<{
  value: Availability<string>
  emptyLabel?: string
  /** Primary lists: value only — Live badge / asOf stay on detail surfaces. */
  compact?: boolean
}>) {
  if (!isAvailable(value)) {
    const etat = backendStateFrom(value)
    return (
      <Badge color={etat === 'ISSUE' ? 'amber' : 'neutral'} className="align-middle">
        {etat === 'OFFLINE' ? emptyLabel : backendStateLabel(etat)}
      </Badge>
    )
  }

  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <Text className="!mt-0 inline text-ink dark:text-fg">{value.value}</Text>
  }

  const etat = backendStateFrom(value)
  if (compact) {
    return <Text className="!mt-0 inline tabular-nums text-ink dark:text-fg">{value.value}</Text>
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Text className="!mt-0 inline text-ink dark:text-fg">{value.value}</Text>
      {etat === 'LIVE' ? (
        <Badge color="green" data-live-badge="">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {backendStateLabel(etat)}
        </Badge>
      ) : (
        <Badge color={etat === 'ISSUE' ? 'amber' : 'neutral'} data-state-badge="">
          {backendStateLabel(etat)}
        </Badge>
      )}
      {value.asOf !== null ? (
        <Text className="!mt-0 text-xs text-fg-tertiary dark:text-fg-secondary">{formatDateTime(value.asOf)}</Text>
      ) : null}
    </span>
  )
}
