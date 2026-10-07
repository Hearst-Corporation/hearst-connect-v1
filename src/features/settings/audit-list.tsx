import { formatDateTime } from '@/lib/format'
import type { AuditEntry } from '@/lib/settings/schema'

/** Les familles du journal — une couleur chacune, pour qu'une ligne se lise d'un coup d'œil. */
export const AUDIT_TONE: Record<AuditEntry['category'], { label: string; dot: string }> = {
  settings: { label: 'Settings', dot: 'bg-sky-300' },
  decision: { label: 'Decision', dot: 'bg-amber-300' },
  offer: { label: 'Offer', dot: 'bg-[var(--hearst-green)]' },
  payment: { label: 'Payment', dot: 'bg-violet-300' },
  email: { label: 'Email', dot: 'bg-white/60' },
  compliance: { label: 'Compliance', dot: 'bg-rose-300' },
  client: { label: 'Client', dot: 'bg-teal-300' },
}

export function AuditList({ entries, compact = false }: Readonly<{ entries: readonly AuditEntry[] | null; compact?: boolean }>) {
  if (entries === null) return <p className="text-sm text-fg-tertiary">The audit log could not be read.</p>
  if (entries.length === 0) return <p className="text-sm text-fg-tertiary">Nothing has happened yet.</p>
  return (
    <ol className="flex flex-col divide-y divide-[var(--ud-line)]">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${AUDIT_TONE[e.category]?.dot ?? 'bg-white/40'}`} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm text-fg">
              <span className="font-medium">{e.actor}</span> <span className="text-fg-secondary">{e.action.toLowerCase()}</span>{' '}
              <span className="break-words">{e.target}</span>
            </p>
            <p className="text-xs text-fg-tertiary">
              {formatDateTime(e.at)}
              {!compact && e.detail ? ` · ${e.detail}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
