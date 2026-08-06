/**
 * Cockpit patrimoine — dérivations pures sur `AdminRegistry`.
 *
 * Accueil (`/admin`) répond : « le patrimoine est-il dans les tolérances —
 * et sinon, que faire en premier ? ». Les chiffres ici (dérive, capital
 * mal-alloué, flux net, file décisionnelle) ne sont pas publiés tels quels
 * par le backend : ils se calculent une fois, depuis les lectures déjà
 * chargées (vaults / strategies / movements / exceptions).
 *
 * Seuil ±200 bps : convention console (pas un champ `breached` backend).
 * Historique 30 j de dérive : absent nommé — aucun snapshot quotidien.
 */

import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/format'
import {
  available,
  combine,
  isAvailable,
  mapAvailability,
  unavailable,
  type AdminRegistry,
  type Availability,
  type Movement,
  type Strategy,
  type Vault,
} from '@/lib/vaults/model'
import { asMoney, denomination, type Denomination } from '@/lib/vaults/overview'

/** Convention console — au-delà, une poche exige une décision. */
export const DRIFT_THRESHOLD_BPS = 200

const ZERO = BigInt(0)
const BPS = BigInt(10000)

export type PocketDrift = Readonly<{
  vaultId: Vault['id']
  vaultLabel: string
  strategyId: Strategy['id']
  pocketLabel: string
  driftBps: number
  beyondThreshold: boolean
  /** |driftBps| × assets / 10000 — null si les actifs de poche sont illisibles. */
  misallocatedAtomic: bigint | null
}>

function parseAtomic(raw: string | null | undefined): bigint | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null
  try {
    return BigInt(raw)
  } catch {
    return null
  }
}

function driftOf(strategy: Strategy): number | null {
  if (strategy.driftBps !== null) return strategy.driftBps
  if (strategy.actualBps === null) return null
  return strategy.actualBps - strategy.targetBps
}

function vaultTotalAtomic(vault: Vault): bigint | null {
  if (!isAvailable(vault.totalAssetsAtomic)) return null
  return parseAtomic(vault.totalAssetsAtomic.value)
}

/**
 * Actifs de poche : lecture `assetsAtomic` si honnête, sinon part
 * `actualBps × total` du coffre. Jamais inventé à partir d'un seul côté.
 */
function pocketAssetsAtomic(strategy: Strategy, vaultTotal: bigint | null): bigint | null {
  if (isAvailable(strategy.assetsAtomic)) {
    return parseAtomic(strategy.assetsAtomic.value)
  }
  if (vaultTotal === null || strategy.actualBps === null) return null
  return (vaultTotal * BigInt(strategy.actualBps)) / BPS
}

function misallocFor(driftBps: number, assets: bigint | null): bigint | null {
  if (assets === null) return null
  const abs = driftBps < 0 ? -driftBps : driftBps
  return (assets * BigInt(abs)) / BPS
}

/**
 * Une ligne par poche dont la dérive est lisible. Les poches sans dérive
 * mesurable sont omises (pas de 0 inventé).
 */
export function pocketDrifts(registry: AdminRegistry): Availability<readonly PocketDrift[]> {
  if (!isAvailable(registry.vaults)) return registry.vaults
  if (registry.vaults.value.length === 0) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_to_read' })
  }

  const rows: PocketDrift[] = []
  let anyStrategiesReadable = false
  let anyStrategiesAbsent: Availability<readonly Strategy[]> | null = null

  for (const vault of registry.vaults.value) {
    if (!isAvailable(vault.strategies)) {
      anyStrategiesAbsent ??= vault.strategies
      continue
    }
    anyStrategiesReadable = true
    const total = vaultTotalAtomic(vault)
    for (const strategy of vault.strategies.value) {
      const driftBps = driftOf(strategy)
      if (driftBps === null) continue
      const assets = pocketAssetsAtomic(strategy, total)
      const abs = driftBps < 0 ? -driftBps : driftBps
      rows.push({
        vaultId: vault.id,
        vaultLabel: vault.label,
        strategyId: strategy.id,
        pocketLabel: strategy.label || strategy.pocket,
        driftBps,
        beyondThreshold: abs > DRIFT_THRESHOLD_BPS,
        misallocatedAtomic: misallocFor(driftBps, assets),
      })
    }
  }

  if (!anyStrategiesReadable) {
    return (
      anyStrategiesAbsent ??
      unavailable({ endpoint: '/api/v1/vault/strategies', reason: 'no_vault_allocation_readable' })
    )
  }

  rows.sort((a, b) => Math.abs(b.driftBps) - Math.abs(a.driftBps))
  return available(rows, {
    provenance: registry.vaults.provenance,
    asOf: registry.vaults.asOf,
    stale: registry.vaults.stale,
  })
}

/** Pire dérive signée (celle au plus grand |bps|) — absence si aucune poche lisible. */
export function worstEstateDriftBps(registry: AdminRegistry): Availability<number> {
  const pockets = pocketDrifts(registry)
  if (!isAvailable(pockets)) return pockets
  if (pockets.value.length === 0) {
    return unavailable({
      endpoint: '/api/v1/vault/strategies',
      status: 'EMPTY',
      reason: 'no_pocket_drift_readable',
    })
  }
  let worst = pockets.value[0]!
  for (const row of pockets.value) {
    if (Math.abs(row.driftBps) > Math.abs(worst.driftBps)) worst = row
  }
  return available(worst.driftBps, {
    provenance: pockets.provenance,
    asOf: pockets.asOf,
    stale: pockets.stale,
  })
}

export function pocketsBeyondThresholdCount(registry: AdminRegistry): Availability<string> {
  return mapAvailability(pocketDrifts(registry), (rows) =>
    formatNumber(rows.filter((r) => r.beyondThreshold).length),
  )
}

/**
 * Somme des |drift| × assets / 10000 sur les poches dont le mal-alloué est
 * calculable. Si aucune poche n'a d'actifs lisibles alors qu'il y a des
 * dérives, l'absence est nommée (pas un $0).
 */
export function misallocatedCapitalAtomic(registry: AdminRegistry): Availability<bigint> {
  const pockets = pocketDrifts(registry)
  if (!isAvailable(pockets)) return pockets
  if (pockets.value.length === 0) {
    return unavailable({
      endpoint: '/api/v1/vault/strategies',
      status: 'EMPTY',
      reason: 'no_pocket_drift_readable',
    })
  }
  let sum = ZERO
  let any = false
  for (const row of pockets.value) {
    if (row.misallocatedAtomic === null) continue
    sum += row.misallocatedAtomic
    any = true
  }
  if (!any) {
    return unavailable({
      endpoint: '/api/v1/vault/strategies',
      status: 'PARTIAL',
      reason: 'pocket_assets_unreadable_for_misallocation',
    })
  }
  return available(sum, {
    provenance: pockets.provenance,
    asOf: pockets.asOf,
    stale: pockets.stale,
  })
}

export function misallocatedCapitalMoney(registry: AdminRegistry): Availability<string> {
  const asset = denomination(registry.vaults)
  return asMoney(misallocatedCapitalAtomic(registry), asset)
}

export type NetFlow = Readonly<{
  depositAtomic: bigint
  redeemAtomic: bigint
  netAtomic: bigint
  /** Au moins un Deposit/Redeem sans montant parseable dans la fenêtre. */
  amountsIncomplete: boolean
}>

/**
 * Flux net = Σ dépôts − Σ rachats sur la fenêtre de mouvements chargée.
 * Un mouvement hors Deposit/Redeem est ignoré. Montants manquants → flag
 * `amountsIncomplete` (la somme porte seulement les lignes lisibles).
 */
export function netFlowFromMovements(movements: Availability<readonly Movement[]>): Availability<NetFlow> {
  if (!isAvailable(movements)) return movements

  let depositAtomic = ZERO
  let redeemAtomic = ZERO
  let amountsIncomplete = false
  let sawFlowEvent = false

  for (const m of movements.value) {
    if (m.eventName !== 'Deposit' && m.eventName !== 'Redeem') continue
    sawFlowEvent = true
    const amount = parseAtomic(m.assetAmountAtomic)
    if (amount === null) {
      amountsIncomplete = true
      continue
    }
    if (m.eventName === 'Deposit') depositAtomic += amount
    else redeemAtomic += amount
  }

  if (!sawFlowEvent && movements.value.length > 0) {
    // Fenêtre lisible, aucun dépôt/rachat : flux net mesuré à zéro.
    return available(
      { depositAtomic: ZERO, redeemAtomic: ZERO, netAtomic: ZERO, amountsIncomplete: false },
      { provenance: movements.provenance, asOf: movements.asOf, stale: movements.stale },
    )
  }

  if (!sawFlowEvent) {
    return available(
      { depositAtomic: ZERO, redeemAtomic: ZERO, netAtomic: ZERO, amountsIncomplete: false },
      { provenance: movements.provenance, asOf: movements.asOf, stale: movements.stale },
    )
  }

  return available(
    {
      depositAtomic,
      redeemAtomic,
      netAtomic: depositAtomic - redeemAtomic,
      amountsIncomplete,
    },
    { provenance: movements.provenance, asOf: movements.asOf, stale: movements.stale },
  )
}

export function netFlowMoney(
  movements: Availability<readonly Movement[]>,
  asset: Availability<Denomination>,
): Availability<{ net: string; deposits: string; redeems: string; amountsIncomplete: boolean }> {
  const flow = netFlowFromMovements(movements)
  return combine(flow, asset, (f, denom) => {
    const fmt = (raw: bigint) =>
      formatCurrency(raw.toString(), { decimals: 0, fromAtomic: 10 ** denom.decimals })
    return {
      net: fmt(f.netAtomic),
      deposits: fmt(f.depositAtomic),
      redeems: fmt(f.redeemAtomic),
      amountsIncomplete: f.amountsIncomplete,
    }
  })
}

/* ── File « à décider » ───────────────────────────────────────────────────── */

export type CockpitDecisionSeverity = 'critique' | 'important' | 'information'

export type CockpitDecision = Readonly<{
  id: string
  severity: CockpitDecisionSeverity
  title: string
  detail: string
  /** Montant formaté en jeu, si dérivable. */
  capitalLabel: string | null
  /** Pour le tri — null = après les lignes chiffrées. */
  capitalRankAtomic: bigint | null
  actionHref: string
  actionLabel: string
}>

const SEVERITY_RANK: Record<CockpitDecisionSeverity, number> = {
  critique: 0,
  important: 1,
  information: 2,
}

function formatSignedBps(bps: number): string {
  const sign = bps > 0 ? '+' : ''
  return `${sign}${formatNumber(bps)}`
}

/**
 * File décisionnelle patrimoine : dérives hors seuil, coffres sans propriétaire,
 * exceptions client. Classée par sévérité puis capital en jeu.
 */
export function buildCockpitDecisionQueue(registry: AdminRegistry): Availability<readonly CockpitDecision[]> {
  const asset = denomination(registry.vaults)
  const pockets = pocketDrifts(registry)
  const items: CockpitDecision[] = []

  if (isAvailable(pockets)) {
    for (const row of pockets.value.filter((r) => r.beyondThreshold)) {
      let capitalLabel: string | null = null
      if (row.misallocatedAtomic !== null && isAvailable(asset)) {
        capitalLabel = formatCurrency(row.misallocatedAtomic.toString(), {
          decimals: 0,
          fromAtomic: 10 ** asset.value.decimals,
        })
      }
      items.push({
        id: `drift-${row.strategyId}`,
        severity: Math.abs(row.driftBps) >= DRIFT_THRESHOLD_BPS * 2 ? 'critique' : 'important',
        title: `${row.vaultLabel} — dérive ${formatSignedBps(row.driftBps)} bps`,
        detail:
          capitalLabel !== null
            ? `${capitalLabel} mal alloués · poche ${row.pocketLabel} · seuil ±${DRIFT_THRESHOLD_BPS} bps`
            : `Poche ${row.pocketLabel} hors ±${DRIFT_THRESHOLD_BPS} bps · montant de poche illisible`,
        capitalLabel,
        capitalRankAtomic: row.misallocatedAtomic,
        actionHref: `/admin/vaults/${encodeURIComponent(row.vaultId)}`,
        actionLabel: 'Ouvrir le coffre',
      })
    }
  }

  if (isAvailable(registry.vaults)) {
    for (const vault of registry.vaults.value) {
      if (isAvailable(vault.client)) continue
      items.push({
        id: `owner-${vault.id}`,
        severity: 'information',
        title: 'Propriétaire du coffre non mappé',
        detail: `${vault.label} — ${vault.client.reason ?? 'owner non reporté'}`,
        capitalLabel: null,
        capitalRankAtomic: null,
        actionHref: '/admin/clients',
        actionLabel: 'Ouvrir les clients',
      })
    }
  }

  if (isAvailable(registry.clientExceptions)) {
    for (const ex of registry.clientExceptions.value) {
      items.push({
        id: `ex-${ex.clientId ?? ex.clientLabel}-${ex.issue}`,
        severity:
          ex.issue === 'DEPLOYMENT_BLOCKED' || ex.issue === 'COMPLIANCE_REVIEW_PENDING'
            ? 'critique'
            : 'important',
        title: ex.clientLabel,
        detail: ex.issue.replaceAll('_', ' ').toLowerCase(),
        capitalLabel: null,
        capitalRankAtomic: null,
        actionHref: ex.actionHref,
        actionLabel: ex.actionLabel,
      })
    }
  }

  // Si ni stratégies ni exceptions ni vaults ne répondent → absence.
  if (
    items.length === 0 &&
    !isAvailable(pockets) &&
    !isAvailable(registry.clientExceptions) &&
    !isAvailable(registry.vaults)
  ) {
    return registry.vaults
  }

  items.sort((a, b) => {
    const bySev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (bySev !== 0) return bySev
    const ca = a.capitalRankAtomic
    const cb = b.capitalRankAtomic
    if (ca === null && cb === null) return 0
    if (ca === null) return 1
    if (cb === null) return -1
    if (ca === cb) return 0
    return ca > cb ? -1 : 1
  })

  return available(items, { provenance: 'indexed' })
}

/** Âge relatif de la lecture mouvements, pour le badge de fraîcheur. */
export function movementsFreshnessLabel(movements: Availability<readonly Movement[]>): string {
  if (!isAvailable(movements)) return 'mouvements indisponibles'
  if (movements.stale) return 'indexeur · stale'
  if (movements.asOf) return `fenêtre · ${formatRelativeTime(movements.asOf)}`
  return 'fenêtre chargée'
}
