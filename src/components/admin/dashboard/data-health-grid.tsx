import type { AdminDataHealthSource } from '@/lib/admin-dashboard/load'
import { surfaceBox } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import { formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

const ORDER = ['Vault', 'Market', 'Indexer', 'Clients', 'Runtime', 'Som KYC'] as const

function tone(status: string): 'ok' | 'warn' | 'bad' {
  if (status === 'LIVE') return 'ok'
  if (status === 'STALE' || status === 'PARTIAL' || status === 'NOT_CONFIGURED') return 'warn'
  return 'bad'
}

export function DataHealthGrid({
  sources,
}: Readonly<{ sources: Availability<readonly AdminDataHealthSource[]> }>) {
  if (!isAvailable(sources)) {
    return <Text>Data unavailable</Text>
  }

  const byLabel = new Map(sources.value.map((s) => [s.label, s]))
  const slots = ORDER.map((label) => ({ label, source: byLabel.get(label) }))

  return (
    <ul
      data-widget="data-health-grid"
      className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2"
    >
      {slots.map(({ label, source }) => {
        const t = source === undefined ? 'warn' : tone(source.status)
        const freshness =
          source?.asOf !== null && source?.asOf !== undefined
            ? formatRelativeTime(source.asOf)
            : source?.status ?? '—'
        return (
          <li key={label} className={clsx(surfaceBox, 'p-2.5')}>
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={clsx(
                  'size-2 shrink-0 rounded-full',
                  t === 'ok' && 'bg-success-400',
                  t === 'warn' && 'bg-warning-400',
                  t === 'bad' && 'bg-danger-500',
                )}
              />
              <p className="truncate text-[11px] font-semibold text-ink dark:text-fg">{label}</p>
            </div>
            <Text className="mt-1 truncate text-[10px]">{freshness}</Text>
          </li>
        )
      })}
    </ul>
  )
}
