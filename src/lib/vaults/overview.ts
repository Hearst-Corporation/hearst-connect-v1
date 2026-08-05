/**
 * The administration overview, as pure arithmetic over the registry.
 *
 * ── Why this module exists ────────────────────────────────────────────────
 * `/admin` computed its own totals inline. A second surface reading the same
 * estate (the green command center laboratory) would have had to restate that
 * arithmetic, and two restatements of "estate value" drift apart the moment
 * one of them is edited. The figures now live here, once, and both surfaces
 * read them.
 *
 * Everything in this file is a PURE function of an `AdminRegistry`. There is
 * no fetching, no clock, no randomness — which is what makes it testable and
 * what keeps it honest: a figure is either derived from a reading the service
 * actually gave, or it stays `Unavailable` and carries the route that would
 * answer it. There is no third branch, and in particular no zero standing in
 * for an absence.
 */

import { formatCurrency, formatNumber } from '@/lib/format'
import { libelleMouvement } from '@/lib/mouvements'
import {
  available,
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  mapAvailability,
  unavailable,
  type AdminRegistry,
  type Availability,
  type Movement,
  type Vault,
} from '@/lib/vaults/model'

const ZERO = BigInt(0)
const BPS = BigInt(10000)

/** The overview reads a short ledger window; the operations log owns the long one. */
export const MOVEMENT_WINDOW = 12

function deploymentRatioBpsFrom(
  deployedCapitalAtomic: Availability<bigint>,
  availableCapitalAtomic: Availability<bigint>,
): Availability<number> {
  if (deployedCapitalAtomic.kind !== 'available' || availableCapitalAtomic.kind !== 'available') {
    return combine(deployedCapitalAtomic, availableCapitalAtomic, () => 0)
  }
  const total = deployedCapitalAtomic.value + availableCapitalAtomic.value
  if (total === ZERO) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_deployed_capital' })
  }
  return available(Number((deployedCapitalAtomic.value * BPS) / total), {
    provenance: 'indexed',
    stale: deployedCapitalAtomic.stale || availableCapitalAtomic.stale,
    asOf: deployedCapitalAtomic.asOf ?? availableCapitalAtomic.asOf,
  })
}

/*
 * Étiquettes d'axe de la courbe d'activité. Ces deux formateurs étaient
 * construits À CHAQUE point et à chaque tour de boucle de regroupement ;
 * `Intl.DateTimeFormat` est coûteux à instancier et n'a aucune raison de l'être
 * plus d'une fois. Même locale, mêmes options, donc rendu strictement
 * identique. Ils restent locaux à ce module : ce sont des étiquettes de
 * graphique, pas le formatage de date du produit (`formatDate` /
 * `formatDateTime` dans `lib/format.ts`), qui a d'autres options.
 */
const JOUR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const JOUR_HEURE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/* ── Denomination and totals ──────────────────────────────────────────────── */

export type Denomination = Readonly<{ symbol: string; decimals: number }>

/**
 * The denomination every money figure on the strip is expressed in.
 *
 * Atomic units cannot be turned into money without knowing their decimals: the
 * same integer is $1.18M at six decimals and $1.18 at twelve. And a total
 * across vaults only means something if they share one denomination — adding
 * USDC to a different asset would produce a number in no currency at all.
 */
export function denomination(vaults: Availability<readonly Vault[]>): Availability<Denomination> {
  if (!isAvailable(vaults)) return vaults
  let found: Denomination | null = null
  for (const vault of vaults.value) {
    if (!isAvailable(vault.asset)) return vault.asset
    if (found === null) {
      found = vault.asset.value
      continue
    }
    if (found.symbol !== vault.asset.value.symbol || found.decimals !== vault.asset.value.decimals) {
      return unavailable({ status: 'PARTIAL', reason: 'vaults_use_different_denominations' })
    }
  }
  if (found === null) return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_to_total' })
  return available(found, { provenance: 'chain', asOf: vaults.asOf })
}

/**
 * Sums one atomic reading over every vault, or reports why the total cannot be
 * stated.
 *
 * A single unreadable vault makes the TOTAL unreadable. Summing the others
 * would publish a figure that is smaller than the truth and looks exactly like
 * a complete one — the most expensive kind of wrong number, because nothing on
 * screen would betray it.
 *
 * An empty register is an absence too: a sum over nothing is arithmetically
 * zero but is not a measurement of anything.
 */
export function sumAcrossVaults(
  vaults: Availability<readonly Vault[]>,
  read: (vault: Vault) => Availability<bigint>,
): Availability<bigint> {
  if (!isAvailable(vaults)) return vaults
  if (vaults.value.length === 0) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_to_total' })
  }
  let total = ZERO
  for (const vault of vaults.value) {
    const part = read(vault)
    if (!isAvailable(part)) return part
    total += part.value
  }
  return available(total, { provenance: vaults.provenance, asOf: vaults.asOf, stale: vaults.stale })
}

/** An atomic total, rendered as money only once its denomination is known too. */
export function asMoney(
  total: Availability<bigint>,
  asset: Availability<Denomination>,
): Availability<string> {
  return combine(total, asset, (raw, denom) =>
    formatCurrency(raw.toString(), { decimals: 0, fromAtomic: 10 ** denom.decimals }),
  )
}

/* ── Visual series ────────────────────────────────────────────────────────── */

/**
 * The two series shapes the overview publishes. They match
 * `DashboardBarPoint` / `DashboardTrendPoint` structurally on purpose: the
 * existing Recharts surfaces consume them unchanged, and so does the
 * laboratory's own SVG rendering.
 */
export type BarPoint = Readonly<{ label: string; value: number }>
export type TrendPoint = Readonly<{ label: string; value: number; detail: string }>

/** How many movements of each type the window holds. Empty when unreadable. */
export function movementTypeBars(
  movements: Availability<readonly { eventName: string }[]>,
): readonly BarPoint[] {
  if (!isAvailable(movements)) return []
  const counts = new Map<string, number>()
  for (const movement of movements.value) {
    const label = libelleMouvement(movement.eventName)
    const previous = counts.get(label)
    counts.set(label, previous === undefined ? 1 : previous + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * The activity curve.
 *
 * Preferred reading is the money moved per movement; when the denomination is
 * unknown or too few movements carry an amount, it falls back to a count per
 * day — a different measurement, so it is labelled as one by its caller. When
 * neither yields two ordered points there is no curve to draw, and that is
 * reported as a named absence rather than a flat line at zero.
 */
export function recentActivityTrend(
  movements: Availability<readonly Movement[]>,
  asset: Availability<Denomination>,
): Availability<readonly TrendPoint[]> {
  if (!isAvailable(movements)) return movements

  const moneyPoints =
    isAvailable(asset)
      ? movements.value
          .filter((movement) => movement.occurredAt !== null && movement.assetAmountAtomic !== null)
          .slice()
          .sort((a, b) => Date.parse(a.occurredAt ?? '') - Date.parse(b.occurredAt ?? ''))
          .slice(-8)
          .map((movement) => {
            const raw = Number(movement.assetAmountAtomic)
            if (!Number.isFinite(raw)) return null
            const occurredAt = movement.occurredAt as string
            return {
              label: JOUR.format(new Date(occurredAt)),
              value: raw / 10 ** asset.value.decimals,
              detail: JOUR_HEURE.format(new Date(occurredAt)),
            }
          })
          .filter((point): point is TrendPoint => point !== null)
      : []

  if (moneyPoints.length >= 2) {
    return available(moneyPoints, {
      provenance: movements.provenance,
      asOf: movements.asOf,
      stale: movements.stale,
    })
  }

  const buckets = new Map<string, { order: number; label: string; value: number; detail: string }>()
  for (const movement of movements.value) {
    if (movement.occurredAt === null) continue
    const timestamp = Date.parse(movement.occurredAt)
    if (Number.isNaN(timestamp)) continue
    const bucket = JOUR.format(new Date(timestamp))
    const current = buckets.get(bucket)
    if (current === undefined) {
      buckets.set(bucket, { order: timestamp, label: bucket, value: 1, detail: bucket })
      continue
    }
    current.value += 1
  }

  const countPoints = [...buckets.values()].sort((a, b) => a.order - b.order)
  if (countPoints.length >= 2) {
    return available(countPoints, {
      provenance: movements.provenance,
      asOf: movements.asOf,
      stale: movements.stale,
    })
  }

  return unavailable({ endpoint: '/api/v1/series1/events', status: 'PARTIAL', reason: 'not_enough_ordered_points' })
}

/**
 * How many vaults are active — or why that count cannot be stated.
 *
 * A vault whose status is `UNREADABLE` is, by definition, one the service could
 * not read: it is neither known-active nor known-inactive. Counting it as
 * "not active" (as a plain `.filter(status === 'ACTIVE').length` does) publishes
 * a number smaller than the truth that looks exactly like a complete one — the
 * VER-05 defect, where `/admin` showed "Active vaults 0 ● Live" over a register
 * whose only vault was unreadable.
 *
 * So the count is refused as soon as one vault is unreadable, exactly like
 * `sumAcrossVaults` refuses a money total. An empty register is an absence too,
 * not a measured zero. A register of vaults all readable yields a real count —
 * which may legitimately be zero.
 */
export function activeVaultCount(vaults: Availability<readonly Vault[]>): Availability<string> {
  if (!isAvailable(vaults)) return vaults
  if (vaults.value.length === 0) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_in_register' })
  }
  if (vaults.value.some((vault) => vault.status === 'UNREADABLE')) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'PARTIAL', reason: 'vault_snapshot_unreadable' })
  }
  const active = vaults.value.filter((vault) => vault.status === 'ACTIVE').length
  return available(formatNumber(active), {
    provenance: vaults.provenance,
    asOf: vaults.asOf,
    stale: vaults.stale,
  })
}

/* ── The overview reading ─────────────────────────────────────────────────── */

/**
 * Every figure both overview surfaces show, derived once from one registry
 * read. Two cards can never disagree about the same vault because there is
 * only one of each number.
 */
export type EstateOverview = Readonly<{
  asset: Availability<Denomination>
  activeVaults: Availability<string>
  totalValueLocked: Availability<string>
  deployedCapital: Availability<string>
  availableCapital: Availability<string>
  /** The raw ratio in basis points — what the gauges need. */
  deploymentRatioBps: Availability<number>
  /** The same ratio as a display string. */
  deploymentRatio: Availability<string>
  recentMovements: Availability<string>
  liveSources: Availability<string>
  recentTrend: Availability<readonly TrendPoint[]>
  movementBars: readonly BarPoint[]
}>

export function estateOverview(registry: AdminRegistry): EstateOverview {
  const vaults = registry.vaults
  const asset = denomination(vaults)

  const deployedCapitalAtomic = sumAcrossVaults(vaults, deployedAtomic)
  const availableCapitalAtomic = sumAcrossVaults(vaults, idleAtomic)

  const deploymentRatioBps = deploymentRatioBpsFrom(deployedCapitalAtomic, availableCapitalAtomic)

  return {
    asset,
    activeVaults: activeVaultCount(vaults),
    totalValueLocked: asMoney(
      sumAcrossVaults(vaults, (vault) => mapAvailability(vault.totalAssetsAtomic, BigInt)),
      asset,
    ),
    deployedCapital: asMoney(deployedCapitalAtomic, asset),
    availableCapital: asMoney(availableCapitalAtomic, asset),
    deploymentRatioBps,
    deploymentRatio: mapAvailability(
      deploymentRatioBps,
      (bps) => `${formatNumber(bps / 100, { maximumFractionDigits: 1 })}%`,
    ),
    recentMovements: mapAvailability(registry.movements, (rows) => formatNumber(rows.length)),
    liveSources: available(
      `${formatNumber(registry.sources.filter((source) => source.status === 'LIVE').length)}/${formatNumber(registry.sources.length)}`,
    ),
    recentTrend: recentActivityTrend(registry.movements, asset),
    movementBars: movementTypeBars(registry.movements),
  }
}
