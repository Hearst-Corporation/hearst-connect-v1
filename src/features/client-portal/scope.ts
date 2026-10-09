import type { ReserveSplitPoint } from '@/features/admin-dashboard/book-charts'
import type { UserDashboard } from '@/features/user-dashboard/load'
import type { ProductionCost } from '@/lib/product/readings'
import { available, valueOf, type Availability } from '@/lib/vaults/model'
import type { PortalOverview, PortalReward, PortalVault } from './load'

/**
 * Le tableau de bord du client, RAMENÉ À SON VAULT.
 *
 * `loadUserDashboard` lit le contexte commun (marché, coût de production, parc,
 * cours) ; tout ce qui parle du client — sa part du parc, son allocation, ses
 * poches — vient du livre de SON vault, le même que lit l'admin. Sans cela,
 * l'écran mêlait les chiffres du fonds entier à ceux du client.
 */
export function scopeToVault(data: UserDashboard, vault: PortalVault): UserDashboard {
  const chain = { provenance: 'chain' as const }
  /* V2 : le dépôt en deux parts — la puissance achetée dans le pool, le buffer
     qui paie l'électricité. Plus de poches, plus de cible ni de dérive. */
  const total = vault.pockets.reduce((t, p) => t + p.capitalUsd, 0)
  const rows = vault.pockets.map((p) => ({ label: p.name, pct: total > 0 ? (p.capitalUsd / total) * 100 : 0 }))
  const fleet = data.fleet.kind === 'available' ? data.fleet.value : null
  const history = vault.allocationHistory ?? []
  return {
    ...data,
    // La composition de CE vault, pas celle de la stratégie Hearst dans son ensemble.
    allocationSeries:
      history.length > 1
        ? available(
            history.map((h) => ({ label: h.at.slice(5, 10), detail: h.at.slice(0, 10), shares: h.shares })),
            chain,
          )
        : data.allocationSeries,
    allocationBars: available(
      rows.map((r) => ({ label: r.label, value: r.pct })),
      chain,
    ),
    exposure: available(
      rows.map((r) => ({ label: r.label, targetPct: r.pct, actualPct: r.pct })),
      chain,
    ),
    bucketYields: available(
      vault.pockets.map((p) => ({ bucket: p.name, yieldPct: p.apyPct, capitalUsdc: p.capitalUsd, trendPct: null })),
      chain,
    ),
    fleet:
      fleet === null
        ? data.fleet
        : available(
            {
              ...fleet,
              allocatedHashrateThs: vault.compute.hashrateThs,
              allocatedMiners: vault.compute.machines,
              allocatedBtcProduced: vault.producedBtc,
              allocatedSharePct: vault.compute.fleetSharePct,
            },
            chain,
          ),
  }
}

/**
 * La réserve dans le temps : chaque versement converti à son entrée, plus les
 * rewards crédités, mois après mois — par vault au survol. Un vault rendu sort
 * de la réserve à partir du mois de sa restitution.
 */
export function reservePoints(vaults: readonly PortalVault[], rewards: readonly PortalReward[]): ReserveSplitPoint[] {
  const credited = rewards.filter((r) => r.status !== 'pending' && r.status !== 'declined')
  const months = [...new Set([...vaults.map((v) => v.lockupStartAt.slice(0, 7)), ...credited.map((r) => r.month)])].sort()
  const all: string[] = []
  if (months.length > 0) {
    const d = new Date(`${months[0]}-01T00:00:00Z`)
    while (true) {
      const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      all.push(m)
      if (m >= months[months.length - 1]) break
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  }
  return all.map((m) => {
    const open = vaults.filter((v) => v.lockupStartAt.slice(0, 7) <= m && !(v.releasedMonth && m >= v.releasedMonth))
    return {
      month: m,
      // V2 : le dépôt loue de la puissance — il n'entre pas dans la réserve.
      deposits: 0,
      accumulated: credited.filter((r) => r.month <= m && open.some((v) => v.vaultId === r.vaultId)).reduce((t, r) => t + r.btc, 0),
      byClient: open.map((v) => ({
        label: v.label,
        value: credited.filter((r) => r.vaultId === v.vaultId && r.month <= m).reduce((t, r) => t + r.btc, 0),
      })),
    }
  })
}

/**
 * Le cours du bitcoin de l'espace client : celui que lit `HearstMiningOracle`.
 *
 * Le bloc Mining Economics affiche le cours du contrat ; la position, les KPI
 * et le relevé convertissent en dollars au même cours. Deux prix du bitcoin
 * sur un même écran se liraient comme un bug. Tant que le contrat ne répond
 * pas, le cours du livre reste en place.
 */
export function withChainSpot(overview: PortalOverview, cost: Availability<ProductionCost>): PortalOverview {
  const spot = valueOf(cost)?.marketPriceUsd
  if (spot === undefined || !(spot > 0)) return overview
  return { ...overview, spotUsd: spot, totals: { ...overview.totals, valueUsd: overview.totals.reserveBtc * spot } }
}
