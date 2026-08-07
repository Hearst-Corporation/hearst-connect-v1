import type { SourceHealth } from '@/lib/vaults/model'
import { surfaceBox } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import { formatRelativeTime } from '@/lib/format'
import clsx from 'clsx'

const LABELS: ReadonlyArray<{ match: RegExp; label: string }> = [
  { match: /client/, label: 'Clients' },
  { match: /compliance|conform/, label: 'KYC' },
  { match: /vault|strategie|rwa/, label: 'Wallets' },
  { match: /series1|event/, label: 'Dépôts' },
  { match: /deployment/, label: 'Souscriptions' },
  { match: /rebalanc/, label: 'Transactions' },
]

const ORDER = ['Clients', 'KYC', 'Wallets', 'Dépôts', 'Souscriptions', 'Transactions'] as const

function mapLabel(id: string, fallback: string): string {
  const hay = `${id} ${fallback}`.toLowerCase()
  for (const row of LABELS) {
    if (row.match.test(hay)) return row.label
  }
  return fallback
}

function tone(s: SourceHealth): 'ok' | 'warn' | 'bad' {
  if (s.status === 'LIVE') return 'ok'
  if (s.status === 'EMPTY' || s.status === 'NOT_EXPOSED') return 'warn'
  return 'bad'
}

/**
 * Seul module technique — point + nom + fraîcheur.
 */
export function SourceStatusGrid({
  sources,
}: Readonly<{ sources: readonly SourceHealth[] }>) {
  const byLabel = new Map<string, SourceHealth>()
  for (const s of sources) {
    const label = mapLabel(s.endpointId, s.label)
    if (!byLabel.has(label)) byLabel.set(label, s)
  }

  const slots = ORDER.map((label) => ({ label, source: byLabel.get(label) }))

  return (
    <ul
      data-widget="source-status-grid"
      className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3"
    >
      {slots.map(({ label, source }) => {
        const t = source === undefined ? 'warn' : tone(source)
        const freshness =
          source?.asOf !== null && source?.asOf !== undefined
            ? formatRelativeTime(source.asOf)
            : 'Fraîcheur inconnue'
        return (
          <li
            key={label}
            className={clsx(surfaceBox, 'p-3')}
            title={source?.endpointId}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={clsx(
                  'size-2.5 shrink-0 rounded-full',
                  t === 'ok' && 'bg-success-400',
                  t === 'warn' && 'bg-warning-400',
                  t === 'bad' && 'bg-danger-500',
                )}
              />
              <p className="text-xs/5 font-semibold text-zinc-950 dark:text-white">{label}</p>
            </div>
            <Text className="mt-2 text-xs">{freshness}</Text>
          </li>
        )
      })}
    </ul>
  )
}
