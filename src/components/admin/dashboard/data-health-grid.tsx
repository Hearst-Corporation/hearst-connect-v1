import { surfaceBox } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import type { AdminDataHealthSource } from '@/lib/admin-dashboard/contracts'
import { formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

const HEALTH_SLOT_CLASS = 'min-h-[var(--dashboard-summary-slot-block-size)]'

/** Stable backend keys — never join on display labels. */
const ORDER: readonly AdminDataHealthSource['key'][] = [
  'vault',
  'market',
  'indexer',
  'clients',
  'runtime',
  'som_kyc',
]

function tone(status: string): 'ok' | 'warn' | 'bad' {
  if (status === 'LIVE') return 'ok'
  if (status === 'STALE' || status === 'PARTIAL' || status === 'NOT_CONFIGURED') return 'warn'
  return 'bad'
}

export function DataHealthGrid({
  sources,
}: Readonly<{ sources: Availability<readonly AdminDataHealthSource[]> }>) {
  if (!isAvailable(sources)) {
    return (
      <div
        className={clsx(
          HEALTH_SLOT_CLASS,
          'flex min-h-0 flex-col justify-center rounded-lg bg-console-inset px-4 py-5 ring-1 ring-console-line-soft',
        )}
      >
        <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
        <Text className="mt-1">Source freshness unavailable.</Text>
      </div>
    )
  }

  const byKey = new Map(sources.value.map((s) => [s.key, s]))
  const slots = ORDER.map((key) => ({ key, source: byKey.get(key) }))

  return (
    <ul
      data-widget="data-health-grid"
      className={clsx(
        HEALTH_SLOT_CLASS,
        'grid min-h-0 grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] content-start gap-2',
      )}
    >
      {slots.map(({ key, source }) => {
        const label = source?.label ?? key
        const t = source === undefined ? 'warn' : tone(source.status)
        // Freshness is the age of the last read. When asOf is absent, freshness is
        // genuinely unknown → "—". Do not leak the raw status string (e.g.
        // "NOT_CONFIGURED") into the freshness line — the status dot already carries it.
        const freshness =
          source?.asOf !== null && source?.asOf !== undefined
            ? formatRelativeTime(source.asOf)
            : '—'
        return (
          <li key={key} className={clsx(surfaceBox, 'p-2.5')}>
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
