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
import { useState, type CSSProperties } from 'react'
import { BoltIcon, CheckBadgeIcon, CpuChipIcon } from '@heroicons/react/16/solid'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { PayElectricityButton } from './pay-electricity-button'
import { CloseActions } from './close-actions'
import type { ChainAttestation } from '@/lib/chain/reserve-registry'

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
  /** V2 — les frais Hearst du mois : 15 % du miné net d'électricité (règle du registre on-chain). */
  feeSats?: number
  feeUsd?: number
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
  attestations = {},
}: Readonly<{
  months: readonly CloseMonth[]
  /** L'attestation on-chain de chaque mois (`AAAA-MM → attestation`), `null` tant qu'il n'est pas publié. */
  attestations?: Readonly<Record<string, ChainAttestation | null>>
  /** Le registre des vaults : le lien de chaque ligne dit `vault-2`, son rang de tranche. */
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

  /* V2 : l'électricité se paie en USDC sur le buffer de chaque vault ; ce qui
     entre dans les réserves, c'est le bitcoin miné, moins les recharges du buffer. */
  const validated = m.lines.filter((l) => l.status === 'distributed' || l.status === 'approved').length
  const toApprove = m.lines.filter((l) => l.status === 'pending').length
  const rewardOf = (l: CloseLine) => rewards[m.month]?.[l.vaultId] ?? null
  const pendingSats = m.lines.filter((l) => l.status === 'pending').reduce((t, l) => t + (rewardOf(l) ?? 0), 0)
  const rewardTotalSats = m.lines.reduce((t, l) => t + (rewardOf(l) ?? 0), 0)
  const feeTotalSats = m.lines.reduce((t, l) => t + (l.feeSats ?? 0), 0)
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
        attestation={attestations[m.month] ?? null}
      />

      {/* Le mois en quatre chiffres : ce que le parc a produit, ce qu'il reste
          à payer, ce qui entre dans les réserves, ce qui reste à valider. La
          bande citrus des fiches client — mêmes tuiles, mêmes chiffres en grand. */}
      <dl className="kpi-band has-foot is-accent" style={{ '--kpi-cols': 4 } as CSSProperties}>
        {[
          ['Fleet output', btc(m.fleetBtcSats), `at ${usd(m.btcPriceUsd)} / BTC · ${btc(feeTotalSats)} Hearst fees`, false, CpuChipIcon],
          [
            'Electricity to pay',
            due.length === 0 ? 'All paid' : usd(dueUsd),
            due.length === 0
              ? `${usd(m.lines.reduce((t, l) => t + l.electricityUsd, 0))} paid from the buffers`
              : `${due.length} of ${m.lines.length} vaults · from their buffers`,
            due.length > 0,
            BoltIcon,
          ],
          // V2 : l'électricité se paie sur les buffers USDC — ce qui entre dans les réserves, c'est le miné, moins les frais Hearst et les recharges.
          ['Into the reserves', btc(rewardTotalSats), `${m.lines.length} vaults · mined, less fees and refills`, false, BitcoinIcon],
          [
            'Rewards to approve',
            toApprove > 0 ? btc(pendingSats) : 'All decided',
            toApprove > 0
              ? `${toApprove} vault${toApprove > 1 ? 's' : ''} · ${validated} / ${m.lines.length} validated · ≈ ${usd((pendingSats / 1e8) * m.btcPriceUsd)}`
              : `${btc(rewardTotalSats)} paid to ${m.lines.length} vaults`,
            toApprove > 0,
            CheckBadgeIcon,
          ],
        ].map((row) => {
          const [label, value, hint, warn, Icon] = row as [string, string, string, boolean, typeof BoltIcon]
          return (
            <div key={label} className="stat-tile">
              <dt className="stat-eyebrow">
                <Icon className="size-4" aria-hidden="true" />
                <span>{label}</span>
              </dt>
              <dd className="stat-value-row">
                <strong className="stat-value mono">{value}</strong>
              </dd>
              {/* Ce qui attend une action reste en gras : l'orange ne se lit pas sur le vert. */}
              <dd className="stat-foot">
                <p className={`stat-footnote${warn ? ' font-semibold' : ''}`}>{hint}</p>
              </dd>
            </div>
          )
        })}
      </dl>

      <PaginatedTable
        className="[&_table]:w-full"
        noun="vaults"
        collapsed={10}
        head={
          <TableRow>
            <TableHeader>Vault</TableHeader>
            <TableHeader>BTC mined</TableHeader>
            <TableHeader>Electricity, from the buffer</TableHeader>
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
              <div className="text-[11px] text-fg-tertiary">
                ≈ {usd(l.grossUsd)}
                {l.feeSats != null ? ` · fee ${btc(l.feeSats)}` : ''}
              </div>
            </TableCell>
            <TableCell className="tabular-nums">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-fg-secondary">{usd(l.electricityUsd)}</span>
                <Badge color={l.electricityStatus === 'paid' ? 'lime' : 'amber'}>
                  {l.electricityStatus === 'paid' ? 'Paid' : 'Due'}
                </Badge>
              </div>
              <div className="text-[11px] text-fg-tertiary">USDC, from the vault’s buffer</div>
            </TableCell>
            {/* Le reward : le bitcoin miné, moins les frais Hearst (15 % du net d'électricité) et la
                part vendue pour recharger le buffer — le montant que « Approve reward » envoie dans la réserve. */}
            <TableCell className="tabular-nums">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-fg">{rewardOf(l) !== null ? btc(rewardOf(l) as number) : '—'}</span>
                <Badge color={REWARD_TONE[l.status] ?? 'neutral'}>{REWARD_LABEL[l.status] ?? l.status}</Badge>
              </div>
              {rewardOf(l) !== null ? (
                <div className="text-[11px] text-fg-tertiary">≈ {usd(((rewardOf(l) as number) / 1e8) * m.btcPriceUsd)}</div>
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
        note="Split key = the computing power each vault rented (85 % of its deposit), over the power of all vaults. Electricity is paid in USDC from each vault’s buffer. Hearst fee = 15 % of the mined bitcoin net of electricity. One vault per deposit: two vaults of the same client are split separately."
        exportData={{
          filename: `hearst-settlement-${m.month}`,
          title: `Settlement — ${monthLabel(m.month)}`,
          columns: [
            'Vault',
            'Vault id',
            'Hashrate (TH/s)',
            'Share of the fleet (%)',
            'BTC mined',
            'Hearst fee (BTC)',
            'Electricity from the buffer (USD)',
            'Electricity status',
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
            l.feeSats != null ? l.feeSats / 1e8 : null,
            l.electricityUsd,
            l.electricityStatus ?? null,
            rewardOf(l) !== null ? (rewardOf(l) as number) / 1e8 : null,
            m.btcPriceUsd,
            l.status,
          ]),
        }}
      />

    </div>
  )
}
