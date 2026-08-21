import { PanelState } from '@/components/admin/dashboard/panel-state'
import type { AdminDataHealthSource } from '@/lib/admin-dashboard/contracts'
import { formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

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
    return <PanelState title="Data unavailable" detail="Source freshness unavailable." />
  }

  const byKey = new Map(sources.value.map((s) => [s.key, s]))
  const slots = ORDER.map((key) => ({ key, source: byKey.get(key) }))

  return (
    <ul
      data-widget="data-health-grid"
      className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-x-6 gap-y-4"
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
          <li key={key} className="min-w-0">
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
              <p className="truncate text-[11px] font-semibold text-fg">{label}</p>
            </div>
            <p className="mt-1 truncate text-[10px] text-fg-tertiary">{freshness}</p>
          </li>
        )
      })}
    </ul>
  )
}
