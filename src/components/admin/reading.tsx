import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import { etatBackend, libelleEtatBackend } from '@/lib/backend/lecture-etat'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Lecture vérace d’une `Availability` — Catalyst only.
 * Trois états backend : En direct · Hors ligne · Problème.
 */
export function AdminReading({
  value,
  emptyLabel = 'Hors ligne',
}: Readonly<{ value: Availability<string>; emptyLabel?: string }>) {
  if (!isAvailable(value)) {
    const etat = etatBackend(value)
    return (
      <Badge color={etat === 'PROBLEME' ? 'amber' : 'zinc'} className="align-middle">
        {etat === 'HORS_LIGNE' ? emptyLabel : libelleEtatBackend(etat)}
      </Badge>
    )
  }

  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <Text className="!mt-0 inline text-zinc-950 dark:text-white">{value.value}</Text>
  }

  const etat = etatBackend(value)
  return (
    <span className="inline-flex items-center gap-2">
      <Text className="!mt-0 inline text-zinc-950 dark:text-white">{value.value}</Text>
      {etat === 'EN_DIRECT' ? (
        <Badge color="green" data-live-badge="">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {libelleEtatBackend(etat)}
        </Badge>
      ) : (
        <Badge color={etat === 'PROBLEME' ? 'amber' : 'zinc'} data-state-badge="">
          {libelleEtatBackend(etat)}
        </Badge>
      )}
      {value.asOf !== null ? (
        <Text className="!mt-0 text-xs text-zinc-500 dark:text-zinc-400">{value.asOf}</Text>
      ) : null}
    </span>
  )
}
