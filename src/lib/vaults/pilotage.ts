/**
 * The subscription pilotage reading — pure arithmetic over an `AdminRegistry`.
 *
 * ── Why this module exists ────────────────────────────────────────────────
 * Le tableau de bord admin (`/admin`) lit le parcours client comme un funnel :
 * compte → KYC → wallet → dépôt → souscription → position. Aucun endpoint
 * backend ne publie ce funnel en un seul objet — il est assemblé ici, une fois,
 * depuis le même `AdminRegistry` que le reste de la console (`clients`,
 * `compliance`, `deployments`, `vaults`, `movements`).
 *
 * ── Honest mapping, not an invented one ───────────────────────────────────
 * This product has no dedicated KYC queue, wallet-creation, deposit-
 * reconciliation, or subscription-signature endpoint. Each funnel step below
 * is mapped onto the closest REAL registry field, and the mapping is named
 * where it is a proxy rather than a literal match:
 *   - "Wallet" reads vault assignment (`ClientException` NO_VAULT_ASSIGNED) —
 *     this product's wallet IS the vault a client is attached to.
 *   - "Dépôt" reads indexed on-chain movements — there is no separate
 *     deposit-reconciliation resource; a movement is the deposit record.
 *   - "Souscription" reads `Deployment.status` directly — this field already
 *     is the subscription lifecycle (`REQUESTED → CONFIRMED`, or `FAILED`).
 * Every step stays an `Availability`: a step whose source did not answer is
 * reported as such, never silently folded into another step's count.
 */

import { formatRelativeTime } from '@/lib/format'
import {
  available,
  isAvailable,
  mapAvailability,
  measuredCount,
  unavailable,
  type AdminRegistry,
  type Availability,
  type ComplianceReview,
  type Deployment,
  type Movement,
} from '@/lib/vaults/model'

/* ── Funnel ────────────────────────────────────────────────────────────────── */

export type FunnelStepId = 'compte' | 'kyc' | 'wallet' | 'depot' | 'souscription' | 'position'

export type FunnelStep = Readonly<{
  id: FunnelStepId
  label: string
  /** Real count at this step, or the named absence of its source. */
  count: Availability<string>
  /** Items blocked or awaiting action at this step, when derivable. */
  pending: Availability<string>
  /** Where an admin resolves what is pending at this step. */
  actionHref: string
  actionLabel: string
  /** The endpoint this step is read from — shown when the step is a proxy, not a literal field. */
  sourceNote: string
}>

/**
 * `stage` is the one KYC field this console defines its own vocabulary for
 * (`/admin/conformite`'s `SEGMENTS`) — `kycStatus` is a free-form backend
 * string with no documented enum, so "still open" is read off `stage`, not
 * guessed off `kycStatus`.
 */
const KYC_TERMINAL_STAGE = 'termine'
const DEPLOYMENT_ACTIVE_STATUSES: ReadonlySet<Deployment['status']> = new Set(['REQUESTED', 'PENDING'])

function countByPredicate<T>(rows: Availability<readonly T[]>, predicate: (row: T) => boolean): Availability<string> {
  return mapAvailability(rows, (list) => String(list.filter(predicate).length))
}

export function buildFunnel(registry: AdminRegistry): readonly FunnelStep[] {
  const kycPending = countByPredicate(registry.compliance, (r) => r.stage !== KYC_TERMINAL_STAGE)
  const vaultsUnassigned = mapAvailability(registry.clientExceptions, (rows) =>
    String(rows.filter((r) => r.issue === 'NO_VAULT_ASSIGNED').length),
  )
  const depositsRecorded = measuredCount(registry.movements)
  const subscriptionsAwaiting = countByPredicate(registry.deployments, (d) =>
    DEPLOYMENT_ACTIVE_STATUSES.has(d.status),
  )
  const positionsActive = countByPredicate(registry.deployments, (d) => d.status === 'CONFIRMED')

  return [
    {
      id: 'compte',
      label: 'Compte créé',
      count: measuredCount(registry.clients),
      pending: unavailable({ reason: 'not_applicable', status: 'NOT_EXPOSED' }),
      actionHref: '/admin/clients',
      actionLabel: 'Ouvrir les clients',
      sourceNote: 'GET /api/v1/clients',
    },
    {
      id: 'kyc',
      label: 'KYC validé',
      count: measuredCount(registry.compliance),
      pending: kycPending,
      actionHref: '/admin/conformite',
      actionLabel: 'Ouvrir la conformité',
      sourceNote: 'GET /api/v1/compliance',
    },
    {
      id: 'wallet',
      label: 'Wallet actif',
      count: measuredCount(registry.vaults),
      pending: vaultsUnassigned,
      actionHref: '/admin/vaults',
      actionLabel: 'Ouvrir les coffres',
      sourceNote: 'GET /api/v1/vault — proxy : ce produit n’a pas d’endpoint wallet dédié, un wallet est un coffre assigné',
    },
    {
      id: 'depot',
      label: 'Dépôt confirmé',
      count: depositsRecorded,
      pending: unavailable({ reason: 'no_deposit_reconciliation_endpoint', status: 'NOT_EXPOSED' }),
      actionHref: '/admin/operations',
      actionLabel: 'Ouvrir les opérations',
      sourceNote: 'GET /api/v1/series1/events — proxy : aucun endpoint de rapprochement de dépôt n’existe',
    },
    {
      id: 'souscription',
      label: 'Souscription signée',
      count: measuredCount(registry.deployments),
      pending: subscriptionsAwaiting,
      actionHref: '/admin/vaults',
      actionLabel: 'Ouvrir les déploiements',
      sourceNote: 'GET /api/v1/deployments',
    },
    {
      id: 'position',
      label: 'Position active',
      count: positionsActive,
      pending: unavailable({ reason: 'not_applicable', status: 'NOT_EXPOSED' }),
      actionHref: '/admin/vaults',
      actionLabel: 'Voir les positions',
      sourceNote: 'GET /api/v1/deployments (status=CONFIRMED)',
    },
  ]
}

/* ── Priority actions ─────────────────────────────────────────────────────── */

export type PriorityKind = 'kyc' | 'wallet' | 'depot' | 'souscription' | 'transaction'
export type PrioritySeverity = 'critique' | 'important' | 'information'

export type PriorityItem = Readonly<{
  id: string
  kind: PriorityKind
  clientLabel: string
  status: string
  ageLabel: string
  severity: PrioritySeverity
  actionHref: string
  actionLabel: string
}>

function ageSeverity(iso: string | null, thresholdDaysCritical: number): PrioritySeverity {
  if (iso === null) return 'information'
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return 'information'
  const days = ms / (1000 * 60 * 60 * 24)
  if (days >= thresholdDaysCritical) return 'critique'
  if (days >= thresholdDaysCritical / 2) return 'important'
  return 'information'
}

function kycPriorityItems(compliance: Availability<readonly ComplianceReview[]>): readonly PriorityItem[] {
  if (!isAvailable(compliance)) return []
  return compliance.value
    .filter((r) => r.stage !== KYC_TERMINAL_STAGE)
    .map((r) => ({
      id: `kyc-${r.id}`,
      kind: 'kyc' as const,
      clientLabel: r.clientLabel,
      status: r.stage,
      ageLabel: formatRelativeTime(r.openedAt),
      severity: ageSeverity(r.openedAt, 3),
      actionHref: '/admin/conformite',
      actionLabel: 'Ouvrir le dossier',
    }))
}

function deploymentPriorityItems(deployments: Availability<readonly Deployment[]>): readonly PriorityItem[] {
  if (!isAvailable(deployments)) return []
  return deployments.value
    .filter((d) => d.status === 'REQUESTED' || d.status === 'PENDING' || d.status === 'FAILED')
    .map((d) => ({
      id: `deployment-${d.id}`,
      kind: d.status === 'FAILED' ? ('transaction' as const) : ('souscription' as const),
      clientLabel: isAvailable(d.clientLabel) ? d.clientLabel.value : 'Client non identifié',
      status: d.status,
      ageLabel: formatRelativeTime(d.requestedAt),
      severity: d.status === 'FAILED' ? 'critique' : ageSeverity(d.requestedAt, 5),
      actionHref: '/admin/vaults',
      actionLabel: d.status === 'FAILED' ? 'Voir l’incident' : 'Reprendre la souscription',
    }))
}

const SEVERITY_RANK: Record<PrioritySeverity, number> = { critique: 0, important: 1, information: 2 }

/**
 * The ranked "needs a decision" queue — derived, never invented, from
 * `compliance` and `deployments` rows the registry already carries. Wallet
 * and deposit steps have no per-item source today (see `buildFunnel`), so
 * they contribute no rows here — the funnel step still names the gap.
 */
export function buildPriorityQueue(registry: AdminRegistry): Availability<readonly PriorityItem[]> {
  if (!isAvailable(registry.compliance) && !isAvailable(registry.deployments)) {
    // Neither source that feeds the queue answered — report the compliance
    // absence, since KYC is the funnel's earliest blocking step.
    return registry.compliance
  }
  const items = [...kycPriorityItems(registry.compliance), ...deploymentPriorityItems(registry.deployments)].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )
  return available(items, { provenance: 'db' })
}

/* ── Distribution by state (for the "répartition des dossiers" module) ──────── */

export type DistributionSlice = Readonly<{ label: string; value: number }>

function tally<T>(rows: readonly T[], keyOf: (row: T) => string): readonly DistributionSlice[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    const previous = counts.get(key)
    counts.set(key, previous === undefined ? 1 : previous + 1)
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value }))
}

export function complianceDistribution(compliance: Availability<readonly ComplianceReview[]>): readonly DistributionSlice[] {
  if (!isAvailable(compliance)) return []
  return tally(compliance.value, (row) => row.kycStatus)
}

export function deploymentDistribution(deployments: Availability<readonly Deployment[]>): readonly DistributionSlice[] {
  if (!isAvailable(deployments)) return []
  return tally(deployments.value, (row) => row.status)
}

/* ── KYC donut buckets (real statuses only) ───────────────────────────────── */

export type KycBucketId = 'valide' | 'en_revue' | 'a_completer' | 'bloque'

export type KycBucket = Readonly<{ id: KycBucketId; label: string; value: number }>

/**
 * Map free-form `kycStatus` strings onto the four operational buckets the
 * dashboard donut shows. Unrecognised statuses are left out of the named
 * buckets — they surface via `complianceDistribution` instead of inventing
 * a fifth pie slice.
 */
function classifyKycStatus(raw: string): KycBucketId | null {
  const s = raw.trim().toLowerCase()
  if (s.length === 0) return null
  if (/\b(block|blocked|refus|reject|rejected|deny|denied|suspend|banned)\b/.test(s)) return 'bloque'
  if (/\b(incomplete|manqu|missing|to[_ -]?complet|a[_ -]?complet|draft|soumis)\b/.test(s)) return 'a_completer'
  if (/\b(review|revue|pending|attente|progress|en[_ -]?cours)\b/.test(s)) return 'en_revue'
  if (/\b(valid|validated|approuv|approved|pass(ed)?|cleared|termine|terminé)\b/.test(s)) return 'valide'
  if (s === 'ok' || s === 'complet' || s === 'complete') return 'valide'
  return null
}

const KYC_BUCKET_LABELS: Record<KycBucketId, string> = {
  valide: 'Validé',
  en_revue: 'En revue',
  a_completer: 'À compléter',
  bloque: 'Bloqué',
}

/**
 * Donut slices from real KYC statuses. Returns `unavailable` when compliance
 * is down; returns an empty available list when no status maps to a bucket
 * (caller shows DONNÉES_INSUFFISANTES — never invents counts).
 */
export function kycStatusBuckets(
  compliance: Availability<readonly ComplianceReview[]>,
): Availability<readonly KycBucket[]> {
  if (!isAvailable(compliance)) {
    return unavailable({
      reason: compliance.reason,
      endpoint: compliance.endpoint,
      status: compliance.status,
    })
  }
  const counts: Record<KycBucketId, number> = {
    valide: 0,
    en_revue: 0,
    a_completer: 0,
    bloque: 0,
  }
  for (const row of compliance.value) {
    const bucket = classifyKycStatus(row.kycStatus)
    if (bucket !== null) counts[bucket] += 1
  }
  const slices: KycBucket[] = (Object.keys(KYC_BUCKET_LABELS) as KycBucketId[])
    .map((id) => ({ id, label: KYC_BUCKET_LABELS[id], value: counts[id] }))
    .filter((s) => s.value > 0)
  return available(slices, { provenance: 'db' })
}

/* ── Subscriptions by product (strategyId) ────────────────────────────────── */

export type ProductVolume = Readonly<{
  product: string
  count: number
  /** Sum of amountAtomic when every row in the group carries a numeric amount. */
  amountAtomic: string | null
}>

/**
 * Horizontal bar source: group deployments by `strategyId`. Amounts are summed
 * only when every deployment in the group has a parseable `amountAtomic` —
 * otherwise `amountAtomic` stays null (count-only bar, no invented sum).
 */
export function subscriptionsByProduct(
  deployments: Availability<readonly Deployment[]>,
): Availability<readonly ProductVolume[]> {
  if (!isAvailable(deployments)) {
    return unavailable({
      reason: deployments.reason,
      endpoint: deployments.endpoint,
      status: deployments.status,
    })
  }
  const groups = new Map<string, { count: number; amounts: bigint[]; allHaveAmount: boolean }>()
  for (const d of deployments.value) {
    const key = d.strategyId ?? 'Produit non identifié'
    const prev = groups.get(key) ?? { count: 0, amounts: [], allHaveAmount: true }
    prev.count += 1
    if (d.amountAtomic === null || d.amountAtomic.trim() === '') {
      prev.allHaveAmount = false
    } else {
      try {
        prev.amounts.push(BigInt(d.amountAtomic))
      } catch {
        prev.allHaveAmount = false
      }
    }
    groups.set(key, prev)
  }
  const rows: ProductVolume[] = [...groups.entries()]
    .map(([product, g]) => ({
      product,
      count: g.count,
      amountAtomic:
        g.allHaveAmount && g.amounts.length === g.count
          ? String(g.amounts.reduce((a, b) => a + b, BigInt(0)))
          : null,
    }))
    .sort((a, b) => b.count - a.count)
  return available(rows, { provenance: 'db' })
}

/* ── Activity heatmap (daily density from movements) ──────────────────────── */

export type HeatmapCell = Readonly<{
  /** ISO date YYYY-MM-DD */
  day: string
  /** Short label for the cell (e.g. "lun 4") */
  label: string
  count: number
}>

/**
 * Last-N-day density from real `occurredAt` timestamps. Days with no event are
 * omitted (not zero-filled) — the grid caller pads geometry without claiming
 * measured zeros.
 */
export function movementDailyHeatmap(
  movements: Availability<readonly Movement[]>,
  dayCount = 28,
): Availability<readonly HeatmapCell[]> {
  if (!isAvailable(movements)) {
    return unavailable({
      reason: movements.reason,
      endpoint: movements.endpoint,
      status: movements.status,
    })
  }
  const buckets = new Map<string, number>()
  for (const m of movements.value) {
    if (m.occurredAt === null) continue
    const t = Date.parse(m.occurredAt)
    if (!Number.isFinite(t)) continue
    const day = new Date(t).toISOString().slice(0, 10)
    const previous = buckets.get(day)
    buckets.set(day, previous === undefined ? 1 : previous + 1)
  }
  if (buckets.size === 0) {
    return available([], { provenance: 'indexed' })
  }
  const sortedDays = [...buckets.keys()].sort()
  const latest = sortedDays[sortedDays.length - 1]!
  const end = Date.parse(`${latest}T00:00:00.000Z`)
  const cells: HeatmapCell[] = []
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const ms = end - i * 24 * 60 * 60 * 1000
    const day = new Date(ms).toISOString().slice(0, 10)
    const count = buckets.get(day)
    if (count === undefined) continue
    cells.push({ day, label: fmt.format(new Date(ms)), count })
  }
  return available(cells, { provenance: 'indexed' })
}
