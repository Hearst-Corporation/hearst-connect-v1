'use client'

import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { clientHref } from '@/lib/clients/vaults'
import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { SegSelect } from '@/components/admin/seg-select'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useState } from 'react'
import { PayElectricityButton } from './pay-electricity-button'
import { CloseActions } from './close-actions'

/**
 * LA CLÔTURE DU MOIS — le geste mensuel, vault par vault, au même endroit.
 *
 * Le parc est unique, les vaults non : un par tranche de chaque client, avec sa
 * propre part de minage. Chaque mois, la production du parc et son électricité
 * se répartissent entre les vaults au prorata du capital que CHACUN a placé
 * dans sa poche Mining. Chaque ligne porte les deux gestes du mois pour ce
 * vault : valider son reward, payer son électricité. Fiche client par fiche
 * client, on perdait la vue d'ensemble (« 4 / 6 validés »).
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
  status: 'pending' | 'approved' | 'distributed' | 'declined' | string
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

const REWARD_LABEL: Record<string, string> = {
  pending: 'To approve',
  approved: 'Approved',
  distributed: 'Paid out',
  declined: 'Declined',
}
const REWARD_TONE: Record<string, 'amber' | 'sky' | 'lime' | 'red'> = {
  pending: 'amber',
  approved: 'sky',
  distributed: 'lime',
  declined: 'red',
}

export function MonthlyClose({
  months,
  decisionIds,
  rewards,
  vaults,
}: Readonly<{
  months: readonly CloseMonth[]
  /** Le registre des vaults : le lien de chaque ligne dit `?vault=2`, son rang de tranche. */
  vaults: readonly AdminVaultRecord[]
  /** Le reward du mois de chaque vault, en sats (`mois → vaultId → sats`) :
   *  ses TROIS poches converties en bitcoin — ce que l'admin valide. */
  rewards: Readonly<Record<string, Readonly<Record<string, number>>>>
  /** La décision de reward en attente de chaque vault (`vaultId → id`) : une
   *  par tranche — l'identifiant client seul visait toujours la première. */
  decisionIds: Readonly<Record<string, string>>
}>) {
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
  const validated = m.lines.filter((l) => l.status === 'distributed' || l.status === 'approved').length
  const toApprove = m.lines.filter((l) => l.status === 'pending').length
  const rewardOf = (l: CloseLine) => rewards[m.month]?.[l.vaultId] ?? null
  const pendingSats = m.lines.filter((l) => l.status === 'pending').reduce((t, l) => t + (rewardOf(l) ?? 0), 0)
  const rewardTotalSats = m.lines.reduce((t, l) => t + (rewardOf(l) ?? 0), 0)
  const due = m.lines.filter((l) => l.electricityStatus !== 'paid')
  const dueUsd = due.reduce((t, l) => t + l.electricityUsd, 0)
  // Ce qui attend un geste remonte en tête : reward à valider, électricité due.
  const lines = [...m.lines].sort(
    (a, b) =>
      Number(b.status === 'pending') + Number(b.electricityStatus !== 'paid') -
        (Number(a.status === 'pending') + Number(a.electricityStatus !== 'paid')) || b.sharePct - a.sharePct,
  )

  return (
    <div className="flex flex-col gap-6">
      <SegSelect
        label="Month"
        value={selected}
        options={ordered.map((x) => ({ value: x.month, label: monthLabel(x.month) }))}
        onChange={setSelected}
      />
      <div className="ud-seg seg-collapsible self-start" role="group" aria-label="Month">
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

      {/* Où en est la clôture, et ses deux gestes en lot. */}
      <CloseActions
        month={m.month}
        total={m.lines.length}
        rewardIds={m.lines.filter((l) => l.status === 'pending' && decisionIds[l.vaultId]).map((l) => decisionIds[l.vaultId])}
        dues={due.map((l) => ({ vaultId: l.vaultId, amountUsd: l.electricityUsd }))}
      />

      {/* Le mois en quatre chiffres : ce que le parc a produit, ce qu'il reste
          à payer, ce qui entre dans les réserves, ce qui reste à valider. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] lg:grid-cols-4">
        {[
          ['Fleet output', btc(m.fleetBtcSats), `at ${usd(m.btcPriceUsd)} / BTC`, false],
          [
            'Electricity to pay',
            due.length === 0 ? 'All paid' : usd(dueUsd),
            due.length === 0 ? `${usd(m.lines.reduce((t, l) => t + l.electricityUsd, 0))} paid across ${m.lines.length} vaults` : `${due.length} of ${m.lines.length} vaults · ≈ ${btc(toSats(dueUsd))}`,
            due.length > 0,
          ],
          ['Mining, net', btc(netTotalSats), `${m.lines.length} vaults, after electricity`, false],
          [
            'Rewards to approve',
            toApprove > 0 ? btc(pendingSats) : 'All decided',
            toApprove > 0
              ? `${toApprove} vault${toApprove > 1 ? 's' : ''} · ${validated} / ${m.lines.length} validated · ≈ ${usd((pendingSats / 1e8) * m.btcPriceUsd)}`
              : `${btc(rewardTotalSats)} paid to ${m.lines.length} vaults`,
            toApprove > 0,
          ],
        ].map(([label, value, hint, warn]) => (
          <div key={label as string} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">{label}</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">{value}</dd>
            <dd className={`text-xs ${warn ? 'text-amber-400' : 'text-fg-tertiary'}`}>{hint}</dd>
          </div>
        ))}
      </dl>

      <PaginatedTable
        className="[&_table]:w-full"
        noun="vaults"
        collapsed={10}
        head={
          <TableRow>
            <TableHeader>Vault</TableHeader>
            <TableHeader>BTC mined</TableHeader>
            <TableHeader>Electricity</TableHeader>
            <TableHeader>Mining, net</TableHeader>
            <TableHeader>Reward of the month</TableHeader>
            <TableHeader>
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        }
        rows={lines.map((l) => (
          <TableRow key={l.id}>
            <TableCell>
              <Link
                href={clientHref(l.clientId, vaults.find((v) => v.vaultId === l.vaultId), 'rewards')}
                className="font-medium text-fg"
              >
                {l.clientLabel}
              </Link>
              <div className="text-[11px] tabular-nums text-fg-tertiary">
                {l.hashrateThs != null ? `${formatNumber(l.hashrateThs / 1000, { maximumFractionDigits: 1 })} PH/s · ` : ''}
                {formatNumber(l.sharePct, { maximumFractionDigits: 1 })} % of the fleet
              </div>
            </TableCell>
            <TableCell className="tabular-nums">
              <div>{btc(l.btcSats)}</div>
              <div className="text-[11px] text-fg-tertiary">≈ {usd(l.grossUsd)}</div>
            </TableCell>
            <TableCell className="tabular-nums">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-fg-secondary">−{btc(toSats(l.electricityUsd))}</span>
                <Badge color={l.electricityStatus === 'paid' ? 'lime' : 'amber'}>
                  {l.electricityStatus === 'paid' ? 'Paid' : 'Due'}
                </Badge>
              </div>
              <div className="text-[11px] text-fg-tertiary">{usd(l.electricityUsd)}</div>
            </TableCell>
            <TableCell className="tabular-nums">
              <div className="font-medium text-[var(--hearst-green)]">{btc(netSats(l))}</div>
              <div className="text-[11px] text-fg-tertiary">≈ {usd(l.netUsd)}</div>
            </TableCell>
            {/* Le reward : les trois poches converties en bitcoin — le montant
                que « Approve reward » envoie dans la réserve du client. */}
            <TableCell className="tabular-nums">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-fg">{rewardOf(l) !== null ? btc(rewardOf(l) as number) : '—'}</span>
                <Badge color={REWARD_TONE[l.status] ?? 'neutral'}>{REWARD_LABEL[l.status] ?? l.status}</Badge>
              </div>
              {rewardOf(l) !== null ? (
                <div className="text-[11px] text-fg-tertiary">≈ {usd(((rewardOf(l) as number) / 1e8) * m.btcPriceUsd)} · 3 buckets</div>
              ) : null}
            </TableCell>
            {/* Les deux gestes du mois pour CE vault. La décision de reward est
                la même que sur la fiche du client : prise ici ou là-bas. */}
            <TableCell className="text-right">
              {/* `justify-end!` : la règle des cellules à bouton de la console centre
                  tout ce qu'elles contiennent. */}
              <div className="flex flex-wrap items-center justify-end! gap-2">
                {l.status === 'pending' && decisionIds[l.vaultId] ? (
                  <DecisionButtons id={decisionIds[l.vaultId]} action="Approve" compact />
                ) : null}
                {l.electricityStatus !== 'paid' ? (
                  <PayElectricityButton amount={String(Math.round(l.electricityUsd))} vaultId={l.vaultId} month={m.month} compact />
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
        note="Split key = the capital each vault holds in its Mining pocket (its capital × its own mining share), over the mining capital of all vaults. One vault per deposit: two vaults of the same client are split separately."
        exportData={{
          filename: `hearst-settlement-${m.month}`,
          title: `Settlement — ${monthLabel(m.month)}`,
          columns: [
            'Vault',
            'Vault id',
            'Hashrate (TH/s)',
            'Share of the fleet (%)',
            'BTC mined',
            'Electricity (BTC)',
            'Electricity (USD)',
            'Electricity status',
            'Mining, net (BTC)',
            'Reward (BTC)',
            'BTC price (USD)',
            'Reward status',
          ],
          data: m.lines.map((l) => [
            l.clientLabel,
            l.vaultId,
            l.hashrateThs ?? null,
            l.sharePct,
            l.btcSats / 1e8,
            toSats(l.electricityUsd) / 1e8,
            l.electricityUsd,
            l.electricityStatus ?? null,
            netSats(l) / 1e8,
            rewardOf(l) !== null ? (rewardOf(l) as number) / 1e8 : null,
            m.btcPriceUsd,
            l.status,
          ]),
        }}
      />

    </div>
  )
}
