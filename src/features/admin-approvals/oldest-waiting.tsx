import Link from 'next/link'
import { approvalAmount } from '@/lib/admin-dashboard/amounts'
import type { AdminApproval, AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { clientHref } from '@/lib/clients/vaults'
import { valueOf, type Availability } from '@/lib/vaults/model'

/**
 * CE QUI ATTEND DEPUIS LE PLUS LONGTEMPS — les demandes les plus anciennes,
 * une ligne chacune : quoi, pour qui, combien, depuis quand. C'est par elles
 * qu'on commence ; un client qui attend une semaine ne doit pas se perdre dans
 * un compteur.
 */

const KIND: Record<string, string> = {
  deposit: 'Deposit to authorise',
  withdrawal: 'Withdrawal to process',
  distribution: 'Reward to sign off',
  rebalance: 'Rebalancing to approve',
  protocol: 'Protocol change',
}
const TAB: Record<string, string> = { distribution: 'rewards', rebalance: 'allocation', protocol: 'allocation' }

function age(iso: string | null): { label: string; late: boolean } {
  if (!iso) return { label: '—', late: false }
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000))
  return { label: days === 0 ? 'today' : `${days} d`, late: days >= 3 }
}

export function OldestWaiting({
  approvals,
  vaults,
  limit = 5,
}: Readonly<{ approvals: Availability<readonly AdminApproval[]>; vaults?: Availability<readonly AdminVaultRecord[]>; limit?: number }>) {
  const rows = [...(valueOf(approvals) ?? [])]
    .sort((a, b) => (a.requestedAt ?? '').localeCompare(b.requestedAt ?? ''))
    .slice(0, limit)
  if (rows.length === 0) return null
  const daysOf = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : 0)
  const max = Math.max(7, ...rows.map((a) => daysOf(a.requestedAt)))
  return (
    <div className="mt-5">
      <p className="mb-2 text-[11px] tracking-[0.12em] text-fg-tertiary uppercase">Waiting longest</p>
      <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
        {rows.map((a) => {
          const { label, late } = age(a.requestedAt)
          const days = daysOf(a.requestedAt)
          const href = clientHref(a.clientId, (vaults ? valueOf(vaults) : null)?.find((v) => v.vaultId === a.vaultId), TAB[a.kind] ?? 'overview')
          return (
            <li key={a.id}>
              {/* Quoi · pour qui · combien · depuis quand (la barre se lit avant le chiffre). */}
              <Link
                href={href}
                className="group grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 gap-y-1 rounded-lg py-2.5 no-underline sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_8.5rem_9rem_1rem]"
              >
                <span className="truncate text-sm text-fg">{KIND[a.kind] ?? a.kind}</span>
                <span className="hidden truncate text-sm text-fg-secondary sm:block">{a.clientLabel}</span>
                <span className="text-right text-sm tabular-nums text-fg">{approvalAmount(a)}</span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className={`block h-full rounded-full ${late ? 'bg-amber-300' : 'bg-white/30'}`}
                      style={{ width: `${Math.max(4, Math.round((days / max) * 100))}%` }}
                    />
                  </span>
                  <span className={`w-10 text-right text-xs tabular-nums ${late ? 'text-amber-300' : 'text-fg-tertiary'}`}>{label}</span>
                </span>
                <span className="text-sm text-fg-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-fg">→</span>
                <span className="col-span-2 truncate text-xs text-fg-tertiary sm:hidden">
                  {a.clientLabel} · {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
