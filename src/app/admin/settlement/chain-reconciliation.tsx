'use client'

import type { ChainAttestation } from '@/lib/chain/reserve-registry'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { formatCurrency } from '@/lib/format'
import type { CloseMonth } from './monthly-close'

/**
 * LE LIVRE FACE À LA CHAÎNE — le rapprochement du mois, dans la clôture.
 *
 * Mois publié : les totaux du livre de Hearst (la clôture, vault par vault) face aux totaux que
 * HearstReserveRegistry a attestés. Un écart veut dire que la chaîne ne dit pas ce que dit le livre :
 * il se corrige par une révision (gouvernance), jamais en silence.
 *
 * Mois pas encore publié : le contrôle AVANT publication. Le contrat refuse une ligne dont les frais ne
 * valent pas 15 % du miné net d'électricité ; on le vérifie ici sur le livre, vault par vault, pour
 * qu'un mois ne parte pas vers un refus.
 */

const FEE_BPS = 1500
const usd = (v: number) => formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
const btc = (sats: number) => btcFromSats(sats)

type Row = Readonly<{ label: string; book: string; chain: string; ok: boolean }>

export function ChainReconciliation({ month, attestation }: Readonly<{ month: CloseMonth; attestation: ChainAttestation | null }>) {
  const lines = month.lines.filter((l) => l.status !== 'declined')
  const mined = lines.reduce((t, l) => t + l.btcSats, 0)
  const fee = lines.reduce((t, l) => t + (l.feeSats ?? 0), 0)
  const electricityUsd = lines.reduce((t, l) => t + l.electricityUsd, 0)

  if (attestation === null) {
    // La règle des frais du contrat, rejouée sur chaque ligne du livre (à 1 sat près pour l'arrondi).
    const feeOk = lines.filter((l) => {
      const elecSats = Math.round((l.electricityUsd / month.btcPriceUsd) * 1e8)
      const expected = Math.floor((Math.max(0, l.btcSats - elecSats) * FEE_BPS) / 10_000)
      return Math.abs((l.feeSats ?? 0) - expected) <= 1
    }).length
    const ready = feeOk === lines.length
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--ud-radius-sm)] px-5 py-3 text-[13px] ring-1 ring-[var(--ud-line)]">
        <span className="font-medium text-fg">Before publication</span>
        <span className={ready ? 'text-success-400' : 'text-danger-400'}>
          {ready
            ? `Hearst fee = 15 % of mined net of electricity on ${feeOk} / ${lines.length} vaults — the registry will accept this month`
            : `Fee rule broken on ${lines.length - feeOk} / ${lines.length} vaults — the registry would refuse these lines`}
        </span>
      </div>
    )
  }

  const t = attestation.totals
  const chainElectricityUsd = (t.electricitySats * t.btcCloseUsdE8) / 1e16
  const rows: readonly Row[] = [
    { label: 'Mined by the vaults', book: btc(mined), chain: btc(t.minedSats), ok: mined === t.minedSats },
    { label: 'Hearst fee', book: btc(fee), chain: btc(t.feeSats), ok: fee === t.feeSats },
    // L'électricité est publiée en sats au cours de clôture : on la reconvertit, au dollar près.
    { label: 'Electricity', book: usd(electricityUsd), chain: usd(chainElectricityUsd), ok: Math.abs(electricityUsd - chainElectricityUsd) <= lines.length },
    { label: 'Vaults', book: String(lines.length), chain: String(t.vaultCount), ok: lines.length === t.vaultCount },
    { label: 'BTC close price', book: usd(month.btcPriceUsd), chain: usd(t.btcCloseUsdE8 / 1e8), ok: Math.round(t.btcCloseUsdE8 / 1e8) === month.btcPriceUsd },
  ]
  const gaps = rows.filter((r) => !r.ok).length

  return (
    <div className="overflow-hidden rounded-[var(--ud-radius-sm)] ring-1 ring-[var(--ud-line)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ud-line)] px-5 py-3 text-[13px]">
        <span className="font-medium text-fg">Book vs on-chain</span>
        <span className={gaps === 0 ? 'text-success-400' : 'text-danger-400'}>
          {gaps === 0 ? 'Everything matches the attested month' : `${gaps} gap${gaps > 1 ? 's' : ''} — correct with a revision`}
        </span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] text-fg-tertiary">
            <th className="px-5 py-2 font-normal">Total</th>
            <th className="px-5 py-2 text-right font-normal">Hearst book</th>
            <th className="px-5 py-2 text-right font-normal">Attested on-chain</th>
            <th className="px-5 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ud-line)]">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-5 py-2 text-fg-secondary">{r.label}</td>
              <td className="px-5 py-2 text-right tabular-nums text-fg">{r.book}</td>
              <td className="px-5 py-2 text-right tabular-nums text-fg">{r.chain}</td>
              <td className={`px-5 py-2 text-right text-[12px] ${r.ok ? 'text-success-400' : 'text-danger-400'}`}>{r.ok ? 'Match' : 'Gap'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
