import type { ReserveSplitPoint } from '@/features/admin-dashboard/book-charts'
import type { UserDashboard } from '@/features/user-dashboard/load'
import type { ProductionCost } from '@/lib/product/readings'
import { available, valueOf, type Availability } from '@/lib/vaults/model'
import type { ChainVaultLedger } from '@/lib/chain/reserve-registry'
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

/**
 * Les chiffres d'un vault, REMPLACÉS par ceux que le registre on-chain a vérifiés.
 *
 * La réserve, le bitcoin produit, les retraits, ce qu'aurait acheté le dépôt et
 * le détail de chaque mois (miné, frais, recharge, versé à la réserve) viennent
 * des lignes que `HearstReserveRegistry.verifyVault` a acceptées — à la date du
 * dernier mois clos attesté. Le backend ne garde que ce qui n'existe pas sur la
 * chaîne : dates, buffer en USDC, retraits en attente, mois pas encore attestés.
 *
 * `ledgers === null` : la chaîne n'est pas configurée ou ne répond pas.
 */
export function withChainLedger(
  vault: PortalVault,
  rewards: readonly PortalReward[],
  ledgers: ReadonlyMap<string, ChainVaultLedger> | null,
): { vault: PortalVault; rewards: readonly PortalReward[] } {
  if (ledgers === null) return { vault: { ...vault, chain: { status: 'unconfigured' } }, rewards }
  const l = ledgers.get(vault.vaultId)
  if (l === undefined) return { vault: { ...vault, chain: { status: 'unverified' } }, rewards }

  const { latest } = l
  const produced = l.months.reduce((t, m) => t + m.toReserveBtc, 0)
  const byMonth = new Map(l.months.map((m) => [m.month, m]))
  return {
    vault: {
      ...vault,
      reserveBtc: latest.reserveBtc,
      producedBtc: Number(produced.toFixed(8)),
      withdrawnBtc: latest.withdrawnTotalBtc,
      capitalBtc: latest.holdBtc,
      availableBtc:
        vault.status === 'RELEASED' ? 0 : Math.max(0, Number((latest.reserveBtc - vault.pendingWithdrawalBtc).toFixed(8))),
      chain: {
        status: 'verified',
        month: latest.month,
        publishedAt: l.publishedAt,
        registry: l.registry,
        explorerUrl: l.explorerUrl,
        bufferBtc: latest.bufferBtc,
        vsHoldPct: l.vsHoldPct,
        rejected: l.rejected,
      },
    },
    rewards: rewards.map((r) => {
      const m = r.vaultId === vault.vaultId ? byMonth.get(r.month) : undefined
      return m === undefined
        ? r
        : {
            ...r,
            btc: m.toReserveBtc,
            minedBtc: m.minedBtc,
            feeBtc: m.feeBtc,
            refillBtc: m.refillBtc,
            usd: Math.round(m.toReserveBtc * r.priceUsd),
            onChain: true,
          }
    }),
  }
}

/** `withChainLedger` sur TOUS les vaults du client : la page, ses onglets et le relevé lisent les mêmes chiffres. */
export function withChainLedgers(
  overview: PortalOverview,
  rewards: readonly PortalReward[],
  ledgers: ReadonlyMap<string, ChainVaultLedger> | null,
): { overview: PortalOverview; rewards: readonly PortalReward[] } {
  let rs = rewards
  const vaults = overview.vaults.map((v) => {
    const r = withChainLedger(v, rs, ledgers)
    rs = r.rewards
    return r.vault
  })
  const live = vaults.filter((v) => v.status === 'ACTIVE')
  const sum = (k: 'reserveBtc' | 'producedBtc' | 'withdrawnBtc' | 'availableBtc' | 'capitalBtc') =>
    Number(live.reduce((t, v) => t + v[k], 0).toFixed(8))
  return {
    overview: {
      ...overview,
      vaults,
      totals: {
        ...overview.totals,
        reserveBtc: sum('reserveBtc'),
        valueUsd: sum('reserveBtc') * overview.spotUsd,
        producedBtc: sum('producedBtc'),
        withdrawnBtc: sum('withdrawnBtc'),
        availableBtc: sum('availableBtc'),
        capitalBtc: sum('capitalBtc'),
      },
    },
    rewards: rs,
  }
}
