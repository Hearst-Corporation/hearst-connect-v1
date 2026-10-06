import { formatCurrency, formatNumber } from '@/lib/format'
import type { AdminApproval } from './contracts'

/**
 * LES MONTANTS DE LA CONSOLE, EN BITCOIN.
 *
 * Le produit est une réserve de bitcoin. Le seul montant en dollars est le
 * versement d'entrée du client (USDC, converti en bitcoin à l'entrée) ; tout le
 * reste — gains des poches convertis, distributions, retraits — est du bitcoin.
 * Le dollar n'apparaît qu'en repère, jamais en titre.
 */

/** « 1.83 BTC » — deux décimales. En dessous d'un centième, on garde deux
 *  chiffres significatifs : « 0.0043 BTC » plutôt qu'un « 0.00 » trompeur. */
export function formatBtcValue(btc: number): string {
  const abs = Math.abs(btc)
  return abs > 0 && abs < 0.01
    ? formatNumber(btc, { maximumSignificantDigits: 2 })
    : formatNumber(btc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function btcFromSats(sats: number | null | undefined): string {
  if (sats === null || sats === undefined || !Number.isFinite(sats)) return '—'
  return `${formatBtcValue(sats / 1e8)} BTC`
}

export function usdRound(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
}

/** Le montant d'une décision : un dépôt en USDC, tout le reste en bitcoin. */
export function approvalAmount(a: Pick<AdminApproval, 'kind' | 'amountUsdc' | 'amountBtcSats'>): string {
  if (a.kind !== 'deposit' && a.amountBtcSats != null) return btcFromSats(a.amountBtcSats)
  return a.amountUsdc != null ? `${usdRound(a.amountUsdc)} USDC` : '—'
}
