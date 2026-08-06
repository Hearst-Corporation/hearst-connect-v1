/**
 * The subscription pilotage reading — pure arithmetic over an `AdminRegistry`.
 *
 * ── Why this module exists ────────────────────────────────────────────────
 * `/admin/dashboard` reads the client journey as a funnel: account → KYC →
 * wallet → deposit → subscription → active position. No backend endpoint
 * publishes that funnel as a single object — it is assembled here, once, from
 * the same registry Accueil (`/admin`) already reads (`clients`, `compliance`,
 * `deployments`, `vaults`, `movements`). Accueil answers "where is the estate";
 * this surface answers "what needs a decision on the client journey".
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
