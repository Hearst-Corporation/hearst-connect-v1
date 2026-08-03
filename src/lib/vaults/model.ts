/**
 * The Hearst Connect admin operating model.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * The console used to be a set of screens, each shaped by whichever endpoint
 * it happened to call. The operating model is the other way round: the admin
 * thinks in VAULTS — a vault holds strategies, belongs to a client, receives
 * deployments, drifts from its targets, and emits movements. Screens are
 * views onto that model, not the other way round.
 *
 * Every entity here is identified by a STABLE IDENTIFIER derived from what
 * the chain or the service actually returns — never by display label. Two
 * strategies both labelled "Strategy 0" on different vaults are different
 * objects, and joining them by name would silently merge them.
 *
 * ── The availability contract ─────────────────────────────────────────────
 * This product's central guarantee is that nothing is invented. Most of the
 * operating model has no source today: the service exposes ONE vault, its
 * strategies, its ledger — and returns 404 for a vault registry, a client
 * directory, a deployment ledger and compliance reviews (verified against the
 * production backend, 2026-07-28).
 *
 * So every field is an `Availability<T>`: either a value with its provenance,
 * or a named absence carrying the reason and the endpoint that would answer
 * it. There is no third state, and in particular there is no zero — a count
 * of `0` clients and "we cannot see clients" are opposite facts, and the type
 * system is what keeps them apart.
 */

import type { ResolvedStatus } from '@/lib/resolved'

/* ── Availability ─────────────────────────────────────────────────────────── */

/** Where a value came from, as reported by the service. */
export type Provenance = 'live' | 'db' | 'indexed' | 'manual' | 'chain' | 'unknown'

export type Available<T> = Readonly<{
  kind: 'available'
  value: T
  provenance: Provenance
  /** ISO timestamp the service says the reading is from. */
  asOf: string | null
  stale: boolean
}>

export type Unavailable = Readonly<{
  kind: 'unavailable'
  /** The service's own machine reason when it gave one. */
  reason: string | null
  /** The endpoint that would answer this, when one is even defined. */
  endpoint: string | null
  status: ResolvedStatus | 'NOT_EXPOSED'
}>

export type Availability<T> = Available<T> | Unavailable

export function available<T>(
  value: T,
  opts: { provenance?: Provenance; asOf?: string | null; stale?: boolean } = {},
): Available<T> {
  return {
    kind: 'available',
    value,
    provenance: opts.provenance ?? 'unknown',
    asOf: opts.asOf ?? null,
    stale: opts.stale ?? false,
  }
}

export function unavailable(
  opts: { reason?: string | null; endpoint?: string | null; status?: ResolvedStatus | 'NOT_EXPOSED' } = {},
): Unavailable {
  return {
    kind: 'unavailable',
    reason: opts.reason ?? null,
    endpoint: opts.endpoint ?? null,
    status: opts.status ?? 'UNAVAILABLE',
  }
}

/**
 * The value carried by an availability, extracted from the union.
 *
 * `Availability<T>` only mentions `T` in its available branch, and TypeScript
 * will not infer a naked type parameter out of a union argument that way — it
 * widens to `unknown` and every caller ends up annotating `combine<A, B, C>`
 * by hand. Recovering `T` with a distributed conditional instead makes
 * inference work at the call site, which is where it matters.
 */
type ValueOf<A> = A extends Available<infer T> ? T : never

export function isAvailable<T>(a: Availability<T>): a is Available<T> {
  return a.kind === 'available'
}

/** The value if there is one — never a fallback, only `null`. */
export function valueOf<T>(a: Availability<T>): T | null {
  return a.kind === 'available' ? a.value : null
}

/**
 * Maps an available value, preserving provenance. An unavailable input stays
 * unavailable: a derivation cannot manufacture a reading its input lacked.
 */
export function mapAvailability<A extends Availability<unknown>, U>(
  a: A,
  f: (value: ValueOf<A>) => U,
): Availability<U> {
  return a.kind === 'available' ? { ...a, value: f(a.value as ValueOf<A>) } : a
}

/**
 * Combines two readings. Both must be available — this is what stops
 * "deployed capital" from being computed when only one of its two operands
 * was actually read.
 */
export function combine<A extends Availability<unknown>, B extends Availability<unknown>, C>(
  a: A,
  b: B,
  f: (a: ValueOf<A>, b: ValueOf<B>) => C,
): Availability<C> {
  if (a.kind !== 'available') return a
  if (b.kind !== 'available') return b
  return available(f(a.value as ValueOf<A>, b.value as ValueOf<B>), {
    provenance: a.provenance,
    asOf: a.asOf ?? b.asOf,
    stale: a.stale || b.stale,
  })
}

/* ── Identifiers ──────────────────────────────────────────────────────────── */

/**
 * A vault is identified by the chain it lives on and the contract that IS the
 * vault. Not by its label: a redeployment on another chain would collide.
 *
 * The encoding is URL-safe and round-trips, because it is also the route
 * segment of `/admin/vaults/[vaultId]`.
 */
declare const vaultIdBrand: unique symbol
export type VaultId = string & { readonly [vaultIdBrand]: true }

declare const clientIdBrand: unique symbol
export type ClientId = string & { readonly [clientIdBrand]: true }

declare const strategyIdBrand: unique symbol
export type StrategyId = string & { readonly [strategyIdBrand]: true }

declare const movementIdBrand: unique symbol
export type MovementId = string & { readonly [movementIdBrand]: true }

declare const deploymentIdBrand: unique symbol
export type DeploymentId = string & { readonly [deploymentIdBrand]: true }

declare const keeperActionIdBrand: unique symbol
export type KeeperActionId = string & { readonly [keeperActionIdBrand]: true }

declare const complianceReviewIdBrand: unique symbol
export type ComplianceReviewId = string & { readonly [complianceReviewIdBrand]: true }

export function vaultId(chainId: number | null | undefined, contractAddress: string | null | undefined): VaultId | null {
  if (contractAddress === null || contractAddress === undefined || contractAddress === '') return null
  const chain = typeof chainId === 'number' && Number.isFinite(chainId) ? chainId : 'unknown'
  return `${chain}-${contractAddress.toLowerCase()}` as VaultId
}

export function parseVaultId(raw: string): { chainId: number | null; contractAddress: string } | null {
  const at = raw.indexOf('-')
  if (at <= 0) return null
  const chain = raw.slice(0, at)
  const address = raw.slice(at + 1)
  if (!/^0x[0-9a-f]{40}$/i.test(address)) return null
  const parsed = Number(chain)
  return { chainId: Number.isFinite(parsed) ? parsed : null, contractAddress: address }
}

/** A strategy belongs to a vault: its pocket key is only unique within one. */
export function strategyId(vault: VaultId, pocket: string): StrategyId {
  return `${vault}:${pocket}` as StrategyId
}

/** The indexer's own event id — already stable and unique. */
export function movementId(raw: string): MovementId {
  return raw as MovementId
}

/* ── Entities ─────────────────────────────────────────────────────────────── */

export type VaultStatus =
  /** Contract code present and the snapshot reads. */
  | 'ACTIVE'
  /** Reads, but the contract reports no code at the address. */
  | 'NO_CODE'
  /** The service answered, and could not read the vault. */
  | 'UNREADABLE'

export type Strategy = Readonly<{
  id: StrategyId
  vaultId: VaultId
  /** Pocket key as returned by the contract ("S0"). */
  pocket: string
  label: string
  targetBps: number
  actualBps: number | null
  driftBps: number | null
  enabled: boolean
  isIdle: boolean
  /** Adapter contract behind the pocket — the strategy's on-chain identity. */
  adapter: string | null
  /**
   * Value held by the pocket, in atomic asset units, when the service
   * publishes one that agrees with the pocket's own share of the vault.
   *
   * `rwa-vault` returns a `pocketAssets` for every pocket, but on this
   * deployment two of the three contradict their own `actualBps` by three
   * orders of magnitude (S1 reports $460 against the ~$332,000 its 2820 bps
   * imply). A figure that disagrees with itself is not a measurement, so it
   * is only carried through when the two readings agree.
   */
  assetsAtomic: Availability<string>
}>

export type Movement = Readonly<{
  id: MovementId
  vaultId: VaultId | null
  eventName: string
  blockNumber: string | null
  txHash: string | null
  chainId: number | null
  investorAddress: string | null
  assetAmountAtomic: string | null
  shareAmountAtomic: string | null
  occurredAt: string | null
  indexedAt: string | null
  /** Which strategy this movement touched, when the ledger says so. */
  strategyId: Availability<StrategyId>
}>

export type Vault = Readonly<{
  id: VaultId
  /** Human name. The contract publishes none, so this is derived, not invented. */
  label: string
  chainId: number | null
  contractAddress: string
  status: VaultStatus
  /** Denomination asset symbol and its decimals. */
  asset: Availability<{ symbol: string; decimals: number }>
  /** Everything the vault holds, in atomic asset units. */
  totalAssetsAtomic: Availability<string>
  /** Contractual cap on what it may hold. */
  tvlCapAtomic: Availability<string>
  /** Room left under the cap — subscription headroom, NOT idle capital. */
  capacityRemainingAtomic: Availability<string>
  utilizationBps: Availability<number>
  navPerShare: Availability<string>
  strategies: Availability<readonly Strategy[]>
  /** Sum of the pockets' actual share. Below 10000 bps, the remainder is idle. */
  deployedBps: Availability<number>
  /** The worst absolute pocket drift — the figure that decides rebalancing. */
  worstDriftBps: Availability<number>
  /** Contract-reported rebalancing state. Unavailable on this deployment. */
  rebalancing: Availability<{ lastRebalanceAt: string | null; driftBps: number | null }>
  /** The client this vault belongs to. No client source exists today. */
  client: Availability<ClientRef>
  lastActivityAt: Availability<string>
}>

export type ClientRef = Readonly<{ id: ClientId; label: string }>

/**
 * A client-side problem an admin has to resolve. Every issue names the
 * operational page that resolves it — an exception you cannot act on is a
 * complaint, not a work item.
 */
export type ClientIssue =
  | 'NO_VAULT_ASSIGNED'
  | 'COMPLIANCE_REVIEW_PENDING'
  | 'VAULT_INACTIVE'
  | 'DEPLOYMENT_BLOCKED'
  | 'MISSING_INVESTOR_RECORD'
  | 'NO_ACTIVE_STRATEGY'

export type ClientException = Readonly<{
  clientId: ClientId | null
  clientLabel: string
  issue: ClientIssue
  relatedVaultId: VaultId | null
  compliance: Availability<string>
  lastActivityAt: Availability<string>
  /** Where the admin goes to resolve it. */
  actionHref: string
  actionLabel: string
}>

export type DeploymentStatus = 'REQUESTED' | 'CONFIRMED' | 'FAILED' | 'PENDING'

export type Deployment = Readonly<{
  id: DeploymentId
  vaultId: VaultId
  clientLabel: Availability<string>
  amountAtomic: string | null
  strategyId: StrategyId | null
  requestedAt: string | null
  confirmedAt: string | null
  status: DeploymentStatus
  reference: string | null
}>

/** One pocket's position against its target, as the rebalancing queue reads it. */
export type RebalancingRow = Readonly<{
  vaultId: VaultId
  vaultLabel: string
  strategyId: StrategyId
  strategyLabel: string
  targetBps: number
  actualBps: number | null
  varianceBps: number | null
  thresholdBps: number
  lastRebalanceAt: Availability<string>
  /** Whether the variance breaches the console's stated threshold. */
  breached: boolean
}>

/**
 * The rebalancing threshold this console reads by, in basis points.
 *
 * The contract publishes no tolerance — `rebalancing/status` answers
 * UNAVAILABLE / `not_exposed_by_contract`. 200 bps (2 points) is therefore a
 * CONVENTION OF THIS CONSOLE, and every surface that applies it says so on
 * screen rather than passing it off as a product rule.
 */
export const REBALANCING_THRESHOLD_BPS = 200

/* ── The registry ─────────────────────────────────────────────────────────── */

/**
 * Everything the dashboard reads, assembled once.
 *
 * Counts are `Availability<number>` on purpose. "0 clients" is a claim the
 * service is in no position to make today, so `clients` is unavailable rather
 * than zero — and the acceptance criterion "are unavailable values clearly
 * distinguished from zero" is satisfied by construction rather than by
 * remembering to check at each call site.
 */
export type AdminRegistry = Readonly<{
  vaults: Availability<readonly Vault[]>
  clients: Availability<readonly ClientRef[]>
  clientExceptions: Availability<readonly ClientException[]>
  deployments: Availability<readonly Deployment[]>
  movements: Availability<readonly Movement[]>
  rebalancing: Availability<readonly RebalancingRow[]>
  /** Per-surface source health, for the compact status strip. */
  sources: readonly SourceHealth[]
}>

export type SourceHealth = Readonly<{
  /** Endpoint id from the backend registry. */
  endpointId: string
  label: string
  status: ResolvedStatus | 'NOT_EXPOSED'
  detail: string | null
  asOf: string | null
}>

/* ── Derived reads ────────────────────────────────────────────────────────── */

/**
 * Capital actually placed in a strategy, and capital sitting idle in the
 * vault. Both are derived from readings that agree — the pockets' shares and
 * the vault total — and both stay unavailable if either operand is missing.
 */
/** Basis-point denominator, as a bigint. (`10_000n` needs an ES2020 target.) */
const BPS = BigInt(10000)

export function deployedAtomic(vault: Vault): Availability<bigint> {
  return combine(vault.totalAssetsAtomic, vault.deployedBps, (total, bps) => {
    return (BigInt(total) * BigInt(bps)) / BPS
  })
}

export function idleAtomic(vault: Vault): Availability<bigint> {
  return combine(vault.totalAssetsAtomic, vault.deployedBps, (total, bps) => {
    return BigInt(total) - (BigInt(total) * BigInt(bps)) / BPS
  })
}

/** Does this vault breach the console's rebalancing threshold? */
export function requiresRebalancing(vault: Vault): Availability<boolean> {
  return mapAvailability(vault.worstDriftBps, (bps) => Math.abs(bps) >= REBALANCING_THRESHOLD_BPS)
}
