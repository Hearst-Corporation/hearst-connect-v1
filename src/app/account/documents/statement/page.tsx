import { PrintButton } from '@/app/proposal/[id]/print-button'
import { loadActivity, loadOverview, loadRewards } from '@/features/client-portal/load'
import { btc, monthLabel, usd } from '@/features/client-portal/parts'
import { requireSession } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { statementHref } from '@/features/client-portal/statement-href'

export const metadata: Metadata = { title: 'Statement' }
export const dynamic = 'force-dynamic'

/**
 * UN RELEVÉ — mensuel (un vault, un mois) ou annuel (tous les vaults, une
 * année). Ce que la réserve valait au début, ce qui y est entré (rewards, par
 * poche), ce qui en est sorti (retraits), ce qu'elle vaut à la fin. Imprimable.
 */
export default async function StatementPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ period?: string[] }>; searchParams: Promise<{ month?: string; year?: string; vault?: string }> }>) {
  await requireSession()
  /* L'adresse : `/account/documents/2028-09/vault-2` (un mois, un vault) ou
     `/account/documents/2028` (l'année). L'ancienne forme `?month=…` est réécrite. */
  const legacy = await searchParams
  if (legacy.month || legacy.year) redirect(statementHref(legacy.year ?? legacy.month ?? '', legacy.vault))
  const [period = '', vaultWord] = (await params).period ?? []
  const year = /^\d{4}$/.test(period) ? period : undefined
  const month = /^\d{4}-\d{2}$/.test(period) ? period : undefined
  if (!year && !month) notFound()
  const wanted = vaultWord?.match(/^vault-(\d+)$/)?.[1]
  // Les relevés de chaque vault sont filtrés plus bas : on lit tous les rewards.
  const [overview, rewards, activity] = await Promise.all([loadOverview(), loadRewards(), loadActivity()])
  if (overview === null || rewards === null) return <p className="p-10 text-sm text-fg-tertiary">This statement could not be produced.</p>

  const inPeriod = (ym: string) => (year ? ym.startsWith(year) : ym === month)
  // `vault-2` : le rang du vault chez le client.
  const vault = overview.vaults[Number(wanted) - 1] ?? overview.vaults.find((v) => v.vaultId === wanted) ?? null
  const scope = year ? overview.vaults : vault ? [vault] : overview.vaults
  const rws = rewards.filter((r) => inPeriod(r.month) && r.status !== 'declined' && scope.some((v) => v.vaultId === r.vaultId))
  const outs = (activity ?? []).filter((a) => (a.type === 'withdrawal' || a.type === 'release') && a.status !== 'declined' && inPeriod(a.at.slice(0, 7)) && scope.some((v) => v.label === a.vault))
  const pocket = (name: string) => rws.reduce((t, r) => t + (r.pockets.find((p) => p.bucket === name)?.btc ?? 0), 0)
  const added = rws.reduce((t, r) => t + r.btc, 0)
  const removed = outs.reduce((t, a) => t + a.btc, 0)
  const title = year ? `Annual report ${year}` : `Monthly statement — ${monthLabel(month ?? '')}`

  return (
    <div className="mx-auto w-full max-w-3xl print:max-w-none">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/account/documents" className="text-sm text-fg-tertiary hover:text-fg">
          ← Documents
        </Link>
        <PrintButton />
      </div>
      <article className="flex flex-col gap-8 rounded-[var(--ud-radius)] bg-[var(--ud-card)] p-10 ring-1 ring-[var(--ud-line)] print:bg-white print:text-black print:ring-0">
        <header className="flex items-start justify-between gap-6 border-b border-[var(--ud-line)] pb-6">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-fg-tertiary uppercase">Hearst Connect · Bitcoin Strategic Reserve</p>
            <h1 className="mt-2 text-2xl font-medium text-fg">{title}</h1>
            <p className="mt-1 text-sm text-fg-secondary">
              {overview.client.name} · {year ? 'All vaults' : (vault?.label ?? 'All vaults')}
            </p>
          </div>
          <p className="text-right text-xs text-fg-tertiary">
            Issued {formatDate(new Date().toISOString())}
            <br />
            BTC/USD {usd(overview.spotUsd)}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {[
            ['Added in the period', `+${btc(added)}`],
            ['Withdrawn in the period', removed > 0 ? `−${btc(removed)}` : btc(0)],
            ['Reserve today', btc(scope.reduce((t, v) => t + v.reserveBtc, 0))],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-fg-tertiary">{k}</p>
              <p className="mt-1 text-lg font-medium tabular-nums text-fg">{v}</p>
            </div>
          ))}
        </section>

        <section>
          <p className="mb-3 text-sm font-medium text-fg">Rewards by pocket</p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--ud-line)]">
              {[
                ['Mining Alpha', pocket('Mining Alpha')],
                ['Bitcoin Lending', pocket('Bitcoin Lending')],
                ['USDC Yield', pocket('USDC Yield')],
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td className="py-2.5 text-fg-secondary">{k}</td>
                  <td className="py-2.5 text-right tabular-nums text-fg">{btc(v as number)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 font-medium text-fg">Total</td>
                <td className="py-2.5 text-right font-medium tabular-nums text-fg">{btc(added)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {outs.length > 0 ? (
          <section>
            <p className="mb-3 text-sm font-medium text-fg">Withdrawals</p>
            <ul className="flex flex-col divide-y divide-[var(--ud-line)] text-sm">
              {outs.map((a) => (
                <li key={a.id} className="flex justify-between py-2.5">
                  <span className="text-fg-secondary">
                    {formatDate(a.at)} · {a.vault}
                    {a.destination ? ` · to ${a.destination}` : ''}
                  </span>
                  <span className="tabular-nums text-fg">−{btc(a.btc)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="border-t border-[var(--ud-line)] pt-5 text-xs leading-relaxed text-fg-tertiary">
          Every reward is converted into bitcoin at its month’s price and credited once Hearst has validated it. Withdrawals are
          executed and co-signed through Fireblocks. Figures in bitcoin are the reference; dollar values are indicative.
        </footer>
      </article>
    </div>
  )
}
