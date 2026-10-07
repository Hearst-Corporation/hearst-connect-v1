import { formatDate } from '@/lib/format'
import type { FireblocksTx } from './load'
import { RefreshWhilePending } from './refresh-while-pending'

/**
 * LES TRANSACTIONS D'UN CLIENT, exécutées par Fireblocks.
 *
 * Une ligne par mouvement d'argent : ce qui part, d'où, vers où, et où en est
 * Fireblocks (signature, diffusion, terminée). Le lien ouvre la transaction
 * dans la console Fireblocks — c'est là qu'elle se signe, jamais ici.
 */

const KIND_LABEL: Record<string, string> = {
  deposit: 'Deposit received',
  conversion: 'Conversion at entry',
  withdrawal: 'Withdrawal',
  release: 'Reserve released',
  electricity: 'Electricity',
  rebalance: 'Rebalancing',
  protocol: 'Protocol switch',
}

const STATUS: Record<string, { label: string; tone: string }> = {
  SUBMITTED: { label: 'Submitted', tone: 'text-sky-300 ring-sky-300/30' },
  PENDING_SIGNATURE: { label: 'Awaiting signers', tone: 'text-amber-300 ring-amber-300/30' },
  PENDING_AUTHORIZATION: { label: 'Awaiting approval', tone: 'text-amber-300 ring-amber-300/30' },
  BROADCASTING: { label: 'Broadcasting', tone: 'text-sky-300 ring-sky-300/30' },
  CONFIRMING: { label: 'Confirming', tone: 'text-sky-300 ring-sky-300/30' },
  COMPLETED: { label: 'Completed', tone: 'text-[var(--hearst-green)] ring-[var(--hearst-green)]/30' },
  FAILED: { label: 'Failed', tone: 'text-red-400 ring-red-400/30' },
  REJECTED: { label: 'Rejected', tone: 'text-red-400 ring-red-400/30' },
  CANCELLED: { label: 'Cancelled', tone: 'text-fg-tertiary ring-[var(--ud-line)]' },
}

const amountOf = (t: FireblocksTx) =>
  t.amount === null
    ? '—'
    : t.asset === 'BTC'
      ? `${t.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} BTC`
      : `${Math.round(t.amount).toLocaleString('en-US')} ${t.asset}`

export function FireblocksTransactions({ transactions }: Readonly<{ transactions: readonly FireblocksTx[] | null }>) {
  if (transactions === null) {
    return <p className="text-sm text-fg-tertiary">Fireblocks transactions could not be read — nothing is shown rather than a guess.</p>
  }
  if (transactions.length === 0) {
    return <p className="text-sm text-fg-tertiary">No money has moved for this client yet.</p>
  }
  const pending = transactions.some((t) => !['COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(t.status))
  return (
    <ul className="flex flex-col divide-y divide-[var(--ud-line)] overflow-hidden rounded-[var(--ud-radius-sm)] ring-1 ring-[var(--ud-line)]">
      {pending ? <RefreshWhilePending /> : null}
      {transactions.map((t) => {
        const status = STATUS[t.status] ?? { label: t.status, tone: 'text-fg-secondary ring-[var(--ud-line)]' }
        return (
          <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-fg">
                {KIND_LABEL[t.kind] ?? t.kind} · <span className="tabular-nums">{amountOf(t)}</span>
              </span>
              <span className="truncate text-xs text-fg-tertiary">
                {t.source ?? '—'} → {t.destination ?? '—'}
                {t.note ? ` · ${t.note}` : ''}
              </span>
            </div>
            <span className="text-xs text-fg-tertiary">{formatDate(t.createdAt)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${status.tone}`}>{status.label}</span>
            {t.consoleUrl ? (
              <a href={t.consoleUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--hearst-green)] no-underline hover:underline">
                Fireblocks ↗
              </a>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
