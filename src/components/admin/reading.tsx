import { AdminToneBadge, toneForBackendState } from '@/components/admin/status-tone'
import { Text } from '@/components/catalyst/text'
import { backendStateFrom, backendStateLabel } from '@/lib/backend/reading-state'
import { formatDateTime } from '@/lib/format'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Truthful reading of an `Availability` — semantic Hearst tones (no Catalyst
 * raw badge palettes).
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
      <AdminToneBadge tone={toneForBackendState(etat)} className="align-middle">
        {etat === 'OFFLINE' ? emptyLabel : backendStateLabel(etat)}
      </AdminToneBadge>
    )
  }

  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <Text className="!mt-0 inline text-fg">{value.value}</Text>
  }

  const etat = backendStateFrom(value)
  if (compact) {
    return <Text className="!mt-0 inline tabular-nums text-fg">{value.value}</Text>
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Text className="!mt-0 inline text-fg">{value.value}</Text>
      <AdminToneBadge
        tone={toneForBackendState(etat)}
        showDot={etat === 'LIVE'}
        data-live-badge={etat === 'LIVE' ? '' : undefined}
        data-state-badge={etat === 'LIVE' ? undefined : ''}
      >
        {backendStateLabel(etat)}
      </AdminToneBadge>
      {value.asOf !== null ? (
        <Text className="!mt-0 text-xs text-fg-secondary">{formatDateTime(value.asOf)}</Text>
      ) : null}
    </span>
  )
}
