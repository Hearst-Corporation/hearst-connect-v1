import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Lecture vérace d’une `Availability` — Catalyst only.
 * Une absence reste une absence : badge nommé, jamais « 0 ».
 */
export function AdminReading({
  value,
  emptyLabel = 'Indisponible',
}: Readonly<{ value: Availability<string>; emptyLabel?: string }>) {
  if (!isAvailable(value)) {
    return (
      <Badge color="zinc" className="align-middle">
        {emptyLabel}
      </Badge>
    )
  }

  const signal = signalOf(value)
  return (
    <span className="inline-flex items-center gap-2">
      <Text className="!mt-0 inline text-zinc-950 dark:text-white">{value.value}</Text>
      {signal === 'stale' ? <Badge color="amber">Obsolète</Badge> : null}
      {signal === 'live' ? <Badge color="lime">En direct</Badge> : null}
    </span>
  )
}
