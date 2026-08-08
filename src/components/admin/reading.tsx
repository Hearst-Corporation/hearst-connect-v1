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
}: Readonly<{ value: Availability<string>; emptyLabel?: string }>) {
  if (!isAvailable(value)) {
    const etat = backendStateFrom(value)
    return (
      <Badge color={etat === 'ISSUE' ? 'amber' : 'zinc'} className="align-middle">
        {etat === 'OFFLINE' ? emptyLabel : backendStateLabel(etat)}
      </Badge>
    )
  }

  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <Text className="!mt-0 inline text-zinc-950 dark:text-white">{value.value}</Text>
  }

  const etat = backendStateFrom(value)
  return (
    <span className="inline-flex items-center gap-2">
      <Text className="!mt-0 inline text-zinc-950 dark:text-white">{value.value}</Text>
      {etat === 'LIVE' ? (
        <Badge color="green" data-live-badge="">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {backendStateLabel(etat)}
        </Badge>
      ) : (
        <Badge color={etat === 'ISSUE' ? 'amber' : 'zinc'} data-state-badge="">
          {backendStateLabel(etat)}
        </Badge>
      )}
      {value.asOf !== null ? (
        <Text className="!mt-0 text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(value.asOf)}</Text>
      ) : null}
    </span>
  )
}
