'use client'

import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { SegSelect } from '@/components/admin/seg-select'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useState } from 'react'

/**
 * LA CLÔTURE DU MOIS, vault par vault.
 *
 * Le parc est unique, les vaults non : chaque client a le sien, avec sa
 * propre part de minage. Chaque mois, la production du parc et son
 * électricité se répartissent entre les vaults au prorata du capital que
 * CHACUN a placé dans sa poche Mining — et chaque ligne est la distribution DE
 * CE client, validée pour lui seul. Plus de « distribution » globale vers une
 * stratégie commune : elle ne disait pas à qui allait l'argent.
 */

export type CloseLine = Readonly<{
  id: string
  vaultId: string
  clientId: string
  clientLabel: string
  miningCapitalUsdc: number
  /** La puissance affectée à ce vault ce mois-là. */
  hashrateThs?: number
  sharePct: number
  btcSats: number
  grossUsd: number
  electricityUsd: number
  netUsd: number
  status: 'pending' | 'approved' | 'distributed' | string
  /** L'électricité de CE vault pour ce mois : payée ou due. */
  electricityStatus?: 'paid' | 'due' | string
}>

export type CloseMonth = Readonly<{
  month: string
  fleetBtcSats: number
  btcPriceUsd: number
  electricityUsd: number
  lines: readonly CloseLine[]
}>

const usd = (v: number) => formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
const btc = (sats: number) => btcFromSats(sats)
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function MonthlyClose({ months, action }: Readonly<{ months: readonly CloseMonth[]; action?: React.ReactNode }>) {
  const ordered = [...months].sort((a, b) => b.month.localeCompare(a.month))
  const [selected, setSelected] = useState(ordered[0]?.month ?? '')
  const m = ordered.find((x) => x.month === selected)

  if (m === undefined) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No monthly close recorded yet.</p>
  }

  /* En bitcoin : l'électricité se paie en dollars, mais elle se déduit du
     bitcoin miné au cours du mois — c'est le net qui entre dans les réserves. */
  const toSats = (usdAmount: number) => (m.btcPriceUsd > 0 ? Math.round((usdAmount / m.btcPriceUsd) * 1e8) : 0)
  const netSats = (l: CloseLine) => l.btcSats - toSats(l.electricityUsd)
  const netTotalSats = m.lines.reduce((s, l) => s + netSats(l), 0)
  const paid = m.lines.filter((l) => l.status === 'distributed').length
  const pending = m.lines.filter((l) => l.status === 'pending').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegSelect
          label="Month"
          value={selected}
          options={ordered.map((x) => ({ value: x.month, label: monthLabel(x.month) }))}
          onChange={setSelected}
        />
        <div className="ud-seg seg-collapsible" role="group" aria-label="Month">
          {ordered.map((x) => (
            <button
              key={x.month}
              type="button"
              aria-pressed={x.month === selected}
              onClick={() => setSelected(x.month)}
              className={`ud-seg-btn${x.month === selected ? ' active' : ''}`}
            >
              {monthLabel(x.month)}
            </button>
          ))}
        </div>
        {action}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] lg:grid-cols-4">
        {[
          ['Fleet output', btc(m.fleetBtcSats), `at ${usd(m.btcPriceUsd)} / BTC`],
          ['Fleet electricity', btc(toSats(m.electricityUsd)), `${usd(m.electricityUsd)} paid, split by hashrate`],
          ['Net to client reserves', btc(netTotalSats), `${m.lines.length} client vaults`],
          ['Rewards validated', `${paid} / ${m.lines.length}`, pending > 0 ? `${pending} to approve — here or on each client page` : 'All validated'],
        ].map(([label, value, hint]) => (
          <div key={label} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">{label}</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">{value}</dd>
            <dd className={`text-xs ${label === 'Rewards validated' && pending > 0 ? 'text-amber-400' : 'text-fg-tertiary'}`}>{hint}</dd>
          </div>
        ))}
      </dl>

      <PaginatedTable
        className="[&_table]:w-full [&_table]:min-w-[60rem]"
        noun="client vaults"
        head={
          <TableRow>
            <TableHeader>Client vault</TableHeader>
            <TableHeader>Hashrate</TableHeader>
            <TableHeader>Share</TableHeader>
            <TableHeader>BTC mined</TableHeader>
            <TableHeader>Electricity</TableHeader>
            <TableHeader>Net to the reserve</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>
              <span className="sr-only">Approve</span>
            </TableHeader>
          </TableRow>
        }
        rows={[...m.lines]
            .sort((a, b) => b.sharePct - a.sharePct)
            .map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={`/admin/clients/${l.clientId}#rewards`} className="font-medium text-fg">
                    {l.clientLabel}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {l.hashrateThs != null ? `${formatNumber(l.hashrateThs / 1000, { maximumFractionDigits: 1 })} PH/s` : '—'}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-14 rounded-full bg-[var(--ud-inset)]">
                      <span className="block h-full rounded-full bg-[var(--hearst-green)]" style={{ width: `${Math.min(100, l.sharePct)}%` }} />
                    </span>
                    <span className="text-xs tabular-nums text-fg-secondary">{formatNumber(l.sharePct, { maximumFractionDigits: 1 })} %</span>
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">
                  <div>{btc(l.btcSats)}</div>
                  <div className="text-[11px] text-fg-tertiary">≈ {usd(l.grossUsd)}</div>
                </TableCell>
                <TableCell className="tabular-nums text-fg-tertiary">
                  <div>−{btc(toSats(l.electricityUsd))}</div>
                  <div className="text-[11px]">{usd(l.electricityUsd)} paid</div>
                </TableCell>
                <TableCell className="tabular-nums">
                  <div className="font-medium text-[var(--hearst-green)]">{btc(netSats(l))}</div>
                  <div className="text-[11px] text-fg-tertiary">≈ {usd(l.netUsd)}</div>
                </TableCell>
                <TableCell>
                  <Badge color={l.status === 'distributed' ? 'lime' : l.status === 'approved' ? 'sky' : 'amber'}>{l.status}</Badge>
                </TableCell>
                {/* La MÊME décision que sur la fiche du client (le reward du mois,
                    toutes poches confondues) : prise ici ou là-bas, elle vaut
                    pour les deux. */}
                <TableCell className="text-right">
                  {l.status === 'pending' ? <DecisionButtons id={`apr_dist_${l.clientId}`} action="Approve reward" /> : null}
                </TableCell>
              </TableRow>
            ))}
        exportData={{
          filename: `hearst-monthly-close-${m.month}`,
          title: `Monthly close — ${monthLabel(m.month)}`,
          columns: ['Client', 'Vault', 'Hashrate (TH/s)', 'Share of the fleet (%)', 'BTC mined', 'Electricity (BTC)', 'Net to the reserve (BTC)', 'Electricity paid (USD)', 'BTC price (USD)', 'Status'],
          data: m.lines.map((l) => [l.clientLabel, l.vaultId, l.hashrateThs ?? null, l.sharePct, l.btcSats / 1e8, toSats(l.electricityUsd) / 1e8, netSats(l) / 1e8, l.electricityUsd, m.btcPriceUsd, l.status]),
        }}
      />

      <p className="text-[11px] leading-relaxed text-fg-tertiary">
        Split key = the capital each vault holds in its Mining pocket (its capital × its own mining share), over
        the mining capital of all vaults. Each vault is bespoke: two vaults of the same size can receive very
        different shares.
      </p>
    </div>
  )
}
