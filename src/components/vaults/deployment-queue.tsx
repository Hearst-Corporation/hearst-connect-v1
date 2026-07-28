import Link from 'next/link'

import { AdminSurface, AdminTable, type AdminTableColumn } from '@/components/admin/surfaces'
import { AdminBody, AdminLabel, AdminSurfaceTitle } from '@/components/admin/typography'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import {
  available,
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  unavailable,
  type Availability,
  type Deployment,
  type DeploymentStatus,
  type Vault,
} from '@/lib/vaults/model'

/**
 * Deployment — capital placed into strategies, and the ledger of who placed it.
 *
 * ── Visual intent ───────────────────────────────────────────────────────────
 * One compact surface: key numbers on top, ledger state below.
 *
 * The SUMMARY is real: deployed capital, undeployed capital and the deployment
 * ratio are derived from readings the vault genuinely publishes (its total
 * assets and the pockets' actual shares), through `deployedAtomic` /
 * `idleAtomic`, which stay unavailable whenever either operand is missing.
 *
 * The QUEUE is not: `GET /api/v1/deployments` answers 404 on this deployment —
 * there is no ledger to read. So the normal state of the lower half is an
 * absence, and it is rendered as one. It deliberately does NOT render an empty
 * eight-column table: a table with headers and no rows reads as "zero
 * deployments", which is a different and false claim from "we cannot see the
 * deployments".
 *
 * Everything the ledger alone could answer — latest deployment, pending
 * confirmations, failures, vaults that never received one — stays unstated
 * rather than being inferred from the summary.
 */

/** The one technical explanation this surface links to. */
const COVERAGE_HREF = entityHref('source', 'deployments')

const INLINE_LINK =
  'text-xs font-medium text-accent-400 underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500'

function Unreadable({ note }: Readonly<{ note: string }>) {
  return (
    <span className="text-zinc-500 dark:text-zinc-400" title={note}>
      Unavailable
    </span>
  )
}

/* ── Summary numbers ───────────────────────────────────────────────────────── */

/**
 * Sums one derived reading across the vaults.
 *
 * There is no zero seed: the fold starts from the first vault's reading, so an
 * empty set produces an absence rather than a total of nothing, and `combine`
 * propagates the first missing operand instead of skipping it. A total that
 * silently omitted an unreadable vault would understate deployed capital while
 * looking authoritative.
 */
function sumOver(
  vaults: Availability<readonly Vault[]>,
  read: (vault: Vault) => Availability<bigint>,
): Availability<bigint> {
  if (!isAvailable(vaults)) return vaults

  // Folded by hand rather than through `combine`: the accumulator has to stay
  // a plain bigint so that the FIRST unreadable vault short-circuits the whole
  // total. A partial sum looks exactly like a complete one on screen, which is
  // the one way this tile could lie.
  let total: bigint | null = null
  let provenance: Availability<bigint> | null = null

  for (const vault of vaults.value) {
    const part = read(vault)
    if (!isAvailable(part)) return part
    total = total === null ? part.value : total + part.value
    provenance = provenance ?? part
  }

  if (total === null || provenance === null || !isAvailable(provenance)) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_readable' })
  }
  return available(total, { provenance: provenance.provenance, asOf: provenance.asOf })
}

/**
 * The denomination the totals are expressed in.
 *
 * Atomic units cannot be rendered as money without knowing their decimals, and
 * amounts in two different assets cannot be added at all. Both cases return an
 * absence rather than a plausible-looking number.
 */
function denomination(vaults: Availability<readonly Vault[]>): Availability<{ symbol: string; decimals: number }> {
  if (!isAvailable(vaults)) return vaults
  let found: { symbol: string; decimals: number } | null = null
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
  if (found === null) {
    return unavailable({ endpoint: '/api/v1/vault', status: 'EMPTY', reason: 'no_vault_readable' })
  }
  return available(found, { provenance: 'chain' })
}

function money(
  atomic: Availability<bigint>,
  asset: Availability<{ symbol: string; decimals: number }>,
): string | null {
  if (!isAvailable(atomic) || !isAvailable(asset)) return null
  return formatCurrency(atomic.value.toString(), { decimals: 0, fromAtomic: 10 ** asset.value.decimals })
}

/**
 * Deployed share of the capital, in basis points, recomputed from the two
 * totals rather than read off a single vault — the summary spans whatever the
 * registry returned, and a vault holding nothing has no ratio to report.
 */
function deploymentRatioBps(
  deployed: Availability<bigint>,
  idle: Availability<bigint>,
): Availability<number> {
  const raw = combine(deployed, idle, (placed, spare) => {
    const total = placed + spare
    if (total === BigInt(0)) return null
    return Number((placed * BigInt(10000)) / total)
  })
  if (!isAvailable(raw)) return raw
  if (raw.value === null) {
    return unavailable({ status: 'EMPTY', reason: 'vault_holds_nothing_to_split' })
  }
  return available(raw.value, { provenance: raw.provenance, asOf: raw.asOf, stale: raw.stale })
}

/* ── The ledger table, for the day a deployment endpoint exists ───────────── */

const STATUS_LABEL: Record<DeploymentStatus, string> = {
  REQUESTED: 'Requested',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
}

/**
 * A semantic hue is spent only where the status is a genuine state claim made
 * by the ledger. "Requested" and "Pending" are ordinary data and stay neutral.
 */
const STATUS_TONE: Record<DeploymentStatus, string> = {
  REQUESTED: 'bg-white/5 text-zinc-300 ring-console-line-strong',
  PENDING: 'bg-white/5 text-zinc-300 ring-console-line-strong',
  CONFIRMED: 'bg-success-400/15 text-success-400 ring-success-400/30',
  FAILED: 'bg-danger-400/20 text-danger-400 ring-danger-400/40',
}

function ledgerColumns(
  asset: Availability<{ symbol: string; decimals: number }>,
  vaultsById: ReadonlyMap<string, Vault>,
): readonly AdminTableColumn<Deployment>[] {
  return [
    {
      key: 'vault',
      header: 'Vault',
      cell: (row) => (
        <VaultEntityLink
          kind="vault"
          id={row.vaultId}
          // Joined by identifier, never by label — two vaults may share a name.
          label={vaultsById.get(row.vaultId)?.label ?? row.vaultId}
        />
      ),
    },
    {
      key: 'client',
      header: 'Client',
      cell: (row) =>
        isAvailable(row.clientLabel) ? (
          // No client identifier exists on a deployment, and a directory that
          // would resolve one is not exposed, so this stays plain text: a link
          // built from a display label would be a fabricated join.
          <span className="text-zinc-950 dark:text-zinc-300">{row.clientLabel.value}</span>
        ) : (
          <SourceAvailabilityBadge availability={row.clientLabel} compact />
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right tabular-nums',
      cell: (row) => {
        if (row.amountAtomic === null || !isAvailable(asset)) {
          return <Unreadable note="No amount, or no denomination to express it in." />
        }
        return (
          <span className="text-zinc-950 dark:text-zinc-300">
            {formatCurrency(row.amountAtomic, { decimals: 2, fromAtomic: 10 ** asset.value.decimals })}
          </span>
        )
      },
    },
    {
      key: 'strategy',
      header: 'Strategy',
      cell: (row) =>
        row.strategyId === null ? (
          <Unreadable note="The ledger did not say which strategy received this deployment." />
        ) : (
          <VaultEntityLink kind="strategy" id={row.strategyId} label={row.strategyId.slice(row.strategyId.lastIndexOf(':') + 1)} />
        ),
    },
    {
      key: 'requested',
      header: 'Requested',
      cell: (row) =>
        row.requestedAt === null ? (
          <Unreadable note="No request timestamp on this entry." />
        ) : (
          <span className="text-zinc-950 tabular-nums dark:text-zinc-300">{formatDateTime(row.requestedAt)}</span>
        ),
    },
    {
      key: 'confirmed',
      header: 'Confirmed',
      cell: (row) =>
        row.confirmedAt === null ? (
          <Unreadable note="Not confirmed, or no confirmation timestamp published." />
        ) : (
          <span className="text-zinc-950 tabular-nums dark:text-zinc-300">{formatDateTime(row.confirmedAt)}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[row.status]}`}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {STATUS_LABEL[row.status]}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Transaction',
      cell: (row) =>
        row.reference === null ? (
          <Unreadable note="No transaction reference on this entry." />
        ) : (
          // The reference is how the ledger names the movement, so it is the
          // only honest anchor into the movement history.
          <Link href={entityHref('movement', row.reference)} className={`${INLINE_LINK} font-mono`}>
            {row.reference}
          </Link>
        ),
    },
  ]
}

/* ── The component ────────────────────────────────────────────────────────── */

export function DeploymentQueue({
  deployments,
  vaults,
}: Readonly<{
  deployments: Availability<readonly Deployment[]>
  vaults: Availability<readonly Vault[]>
}>) {
  const asset = denomination(vaults)
  const deployed = sumOver(vaults, deployedAtomic)
  const idle = sumOver(vaults, idleAtomic)
  const ratio = deploymentRatioBps(deployed, idle)

  const vaultsById = new Map<string, Vault>()
  if (isAvailable(vaults)) {
    for (const vault of vaults.value) vaultsById.set(vault.id, vault)
  }

  const deployedValue = money(deployed, asset)
  const idleValue = money(idle, asset)
  const ratioValue = isAvailable(ratio) ? formatPercent(ratio.value, { fromBps: true, maximumFractionDigits: 1 }) : null
  const assetLabel = isAvailable(asset) ? asset.value.symbol : '—'

  return (
    <AdminSurface className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <AdminSurfaceTitle className="text-sm/5">Deployments</AdminSurfaceTitle>
          <div className="grid min-w-0 grid-cols-1 gap-2.5 text-right sm:grid-cols-3">
            <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
              <AdminLabel>Deployed</AdminLabel>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                {deployedValue ?? 'Unavailable'}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
              <AdminLabel>Undeployed</AdminLabel>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                {idleValue ?? 'Unavailable'}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
              <AdminLabel>Ratio</AdminLabel>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                {ratioValue ?? 'Unavailable'}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{assetLabel}</p>
      </div>

      {!isAvailable(deployments) ? (
        <div className="border-t border-zinc-950/10 px-4 py-3 sm:px-5 dark:border-console-line">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <SourceAvailabilityBadge availability={deployments} compact />
            <Link href={COVERAGE_HREF} className={INLINE_LINK}>
              Data coverage
            </Link>
          </div>
          <AdminBody className="mt-2">Ledger not exposed.</AdminBody>
        </div>
      ) : deployments.value.length === 0 ? (
        <div className="border-t border-zinc-950/10 px-4 py-3 sm:px-5 dark:border-console-line">
          <AdminBody>No deployment recorded.</AdminBody>
        </div>
      ) : (
        <div className="border-t border-zinc-950/10 dark:border-console-line">
          <AdminTable columns={ledgerColumns(asset, vaultsById)} rows={deployments.value} keyFn={(row) => row.id} />
        </div>
      )}
    </AdminSurface>
  )
}
