import Link from 'next/link'
import { formatDate } from '@/lib/format'
import type { PortalActivity, PortalOverview, PortalReward, PortalVault } from './load'

/* Les briques de l'espace client — partagées par ses écrans. */

export const btc = (n: number, d = 4) => `${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })} BTC`
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Le blocage d'un vault : où il en est, en mois et en barre. */
export function LockupBar({ vault }: Readonly<{ vault: PortalVault }>) {
  const pct = Math.min(100, Math.round((vault.elapsedMonths / Math.max(1, vault.lockupMonths)) * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-fg-tertiary">
        <span>
          Month {vault.elapsedMonths} of {vault.lockupMonths}
        </span>
        <span>Unlocks {formatDate(vault.lockupEndAt)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="block h-full rounded-full bg-white/50" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const POCKET_TONE = ['bg-[var(--hearst-green)]', 'bg-white/60', 'bg-white/25'] as const

/** L'allocation d'un vault : la cible, et où il est aujourd'hui. */
export function AllocationBar({ vault, detailed = false }: Readonly<{ vault: PortalVault; detailed?: boolean }>) {
  const t = vault.allocation.target
  const c = vault.allocation.current
  const rows = [
    { name: 'Mining Alpha', target: t.mining, now: c.mining },
    { name: 'Bitcoin Lending', target: t.lending, now: c.lending },
    { name: 'USDC Yield', target: t.stable, now: c.stable },
  ]
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={r.name} className={POCKET_TONE[i]} style={{ width: `${r.now / 100}%` }} />
        ))}
      </div>
      {detailed ? (
        <ul className="flex flex-col gap-1.5 text-xs">
          {rows.map((r, i) => (
            <li key={r.name} className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${POCKET_TONE[i]}`} aria-hidden="true" />
              <span className="flex-1 text-fg-secondary">{r.name}</span>
              <span className="tabular-nums text-fg">{(r.now / 100).toFixed(1)} %</span>
              <span className="w-24 text-right tabular-nums text-fg-tertiary">target {(r.target / 100).toFixed(0)} %</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Une carte de vault : sa réserve, ce qu'il a produit, son blocage, son allocation. */
export function VaultCard({ vault, href }: Readonly<{ vault: PortalVault; href: string }>) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-[var(--ud-radius)] bg-[var(--ud-card)] p-[var(--ud-pad-card)] no-underline ring-1 ring-[var(--ud-line)] transition-colors hover:bg-[#262626]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">{vault.label}</p>
          <p className="text-xs text-fg-tertiary">
            {usd(vault.principalUsdc)} deposited · entry at {usd(vault.entryRateUsd)} / BTC
          </p>
        </div>
        <span className="text-sm text-fg-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-fg">→</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[26px] leading-none font-medium tabular-nums text-fg">{btc(vault.reserveBtc)}</p>
          <p className="mt-1.5 text-xs text-fg-tertiary">
            {btc(vault.capitalBtc)} bought at entry · <span className="text-[var(--hearst-green)]">+{btc(vault.producedBtc)}</span> produced
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--hearst-green)] ring-1 ring-[var(--hearst-green)]/30">
          +{vault.vsHodlPct} %
        </span>
      </div>
      {vault.status === 'RELEASED' ? (
        <p className="text-xs text-fg-secondary">Lockup ended — the reserve was returned to you in bitcoin.</p>
      ) : (
        <>
          <LockupBar vault={vault} />
          <AllocationBar vault={vault} />
        </>
      )}
    </Link>
  )
}

const TYPE: Record<string, string> = { deposit: 'Deposit', reward: 'Monthly reward', withdrawal: 'Withdrawal', release: 'Reserve released' }
const STATUS: Record<string, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'text-fg-secondary ring-[var(--ud-line)]' },
  credited: { label: 'Credited', tone: 'text-fg-secondary ring-[var(--ud-line)]' },
  pending: { label: 'Pending', tone: 'text-amber-300 ring-amber-300/30' },
  processing: { label: 'Processing', tone: 'text-sky-300 ring-sky-300/30' },
  declined: { label: 'Declined', tone: 'text-red-400 ring-red-400/30' },
}

/** Une ligne du registre : quoi, quel vault, combien, son statut — et, pour un retrait, ses étapes. */
export function ActivityRow({ item, withSteps = false }: Readonly<{ item: PortalActivity; withSteps?: boolean }>) {
  const st = STATUS[item.status] ?? { label: item.status, tone: 'text-fg-secondary ring-[var(--ud-line)]' }
  const out = item.type === 'withdrawal' || item.type === 'release'
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_7rem]">
        <div className="min-w-0">
          <p className="truncate text-sm text-fg">
            {TYPE[item.type] ?? item.type}
            {item.month ? <span className="text-fg-tertiary"> · {monthLabel(item.month)}</span> : null}
          </p>
          <p className="truncate text-xs text-fg-tertiary">
            {item.vault} · {formatDate(item.at)}
            {item.destination ? ` · to ${item.destination}` : ''}
          </p>
        </div>
        <p className={`text-right text-sm tabular-nums ${out ? 'text-fg' : 'text-[var(--hearst-green)]'}`}>
          {out ? '−' : '+'}
          {btc(item.btc)}
        </p>
        <p className="hidden text-right text-xs tabular-nums text-fg-tertiary sm:block">≈ {usd(item.usd)}</p>
        <span className={`hidden justify-self-end rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 sm:inline ${st.tone}`}>{st.label}</span>
      </div>
      {withSteps && item.steps ? (
        /* Le suivi d'un retrait : demandé → approuvé → co-signé → confirmé. */
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {item.steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  s.done ? 'bg-[var(--hearst-green)] text-[var(--hearst-green-ink)]' : 'text-fg-tertiary ring-1 ring-[var(--ud-line)]'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              <span className={s.done ? 'text-fg-secondary' : 'text-fg-tertiary'}>{s.label}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  )
}

/** Les rewards mois par mois — la poche de chaque bitcoin. */
export function RewardsTable({ rewards }: Readonly<{ rewards: readonly PortalReward[] }>) {
  if (rewards.length === 0) return <p className="text-sm text-fg-tertiary">No reward yet — the first arrives after your first full month.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-[0.08em] text-fg-tertiary uppercase">
            <th className="py-2 pr-3 font-medium">Month</th>
            <th className="py-2 pr-3 text-right font-medium">Mining</th>
            <th className="py-2 pr-3 text-right font-medium">Lending</th>
            <th className="py-2 pr-3 text-right font-medium">USDC yield</th>
            <th className="py-2 pr-3 text-right font-medium">Total</th>
            <th className="py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ud-line)]">
          {rewards.map((r) => (
            <tr key={`${r.vaultId}:${r.month}`}>
              <td className="py-2.5 pr-3 text-fg">{monthLabel(r.month)}</td>
              {r.pockets.map((p) => (
                <td key={p.bucket} className="py-2.5 pr-3 text-right tabular-nums text-fg-secondary">
                  {p.btc.toFixed(4)}
                </td>
              ))}
              <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-fg">{btc(r.btc)}</td>
              <td className="py-2.5 text-right text-xs">
                <span className={r.status === 'pending' ? 'text-amber-300' : 'text-fg-tertiary'}>
                  {r.status === 'pending' ? 'Being validated' : r.status === 'declined' ? 'Declined' : 'Credited'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** L'interlocuteur du client : une personne, un e-mail, un téléphone — pas un formulaire. */
export function OwnerCard({ owner }: Readonly<{ owner: PortalOverview['owner'] }>) {
  const initials = owner.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.08] text-sm font-medium text-fg">{initials}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{owner.name}</p>
          <p className="truncate text-xs text-fg-tertiary">{owner.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${owner.email}`} className="ud-detail-btn inline-flex items-center no-underline">
          Email
        </a>
        <a
          href={`tel:${owner.phone.replace(/\s+/g, '')}`}
          className="inline-flex h-7 items-center rounded-full px-3 text-xs text-fg ring-1 ring-[var(--ud-line)] no-underline hover:bg-white/5"
        >
          {owner.phone}
        </a>
      </div>
    </div>
  )
}
