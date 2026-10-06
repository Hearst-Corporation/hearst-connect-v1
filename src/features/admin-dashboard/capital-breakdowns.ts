import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'

/**
 * Répartitions de l'AUM, toutes tirées du registre des vaults.
 *
 * Chaque vault compte pour son capital (`principalUsdc`) : on répartit de
 * l'argent, pas des dossiers — un family office à 850 k$ ne pèse pas comme une
 * banque à 12 M$. Un vault sans capital lu n'entre dans aucune part.
 */

export type CapitalSlice = { readonly label: string; readonly value: number }

function capitalOf(vault: AdminVaultRecord): number {
  return vault.principalUsdc !== null && vault.principalUsdc > 0 ? vault.principalUsdc : 0
}

function grouped(vaults: readonly AdminVaultRecord[], keyOf: (v: AdminVaultRecord) => string): CapitalSlice[] {
  const sums = new Map<string, number>()
  for (const v of vaults) {
    const capital = capitalOf(v)
    if (capital === 0) continue
    const key = keyOf(v)
    sums.set(key, (sums.get(key) ?? 0) + capital)
  }
  return [...sums].map(([label, value]) => ({ label, value }))
}

/** La réserve de bitcoin d'un vault : son versement converti + ce qui s'y est ajouté. */
function reserveBtcOf(vault: AdminVaultRecord): number {
  return ((vault.capitalBtcSats ?? 0) + (vault.accruedBtcSats ?? 0)) / 1e8
}

/** Les réserves de bitcoin, par typologie de client. */
export function reserveByClientKind(vaults: readonly AdminVaultRecord[]): CapitalSlice[] {
  const sums = new Map<string, number>()
  for (const v of vaults) {
    const btc = reserveBtcOf(v)
    if (btc <= 0) continue
    const key = v.clientKind ? v.clientKind : 'Not recorded'
    sums.set(key, (sums.get(key) ?? 0) + btc)
  }
  return [...sums].map(([label, value]) => ({ label, value }))
}

/** Par typologie de client. Sans type porté par le backend : « Not recorded ». */
export function capitalByClientKind(vaults: readonly AdminVaultRecord[]): CapitalSlice[] {
  return grouped(vaults, (v) => (v.clientKind ? v.clientKind : 'Not recorded'))
}

/**
 * Par échéance de lockup : le capital qui peut sortir bientôt. C'est la
 * question de liquidité — et de renouvellement commercial — que pose un book
 * de vaults bloqués.
 */
export function capitalByMaturity(vaults: readonly AdminVaultRecord[]): CapitalSlice[] {
  return grouped(vaults, (v) => {
    if (v.lockupMonths === null || v.lockupElapsedMonths === null) return 'Term not read'
    const left = v.lockupMonths - v.lockupElapsedMonths
    if (left <= 3) return 'Within 3 months'
    if (left <= 12) return '3 to 12 months'
    return 'Beyond 12 months'
  })
}
