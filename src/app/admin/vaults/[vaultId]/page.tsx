import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection, AdminSurface } from '@/components/admin/surfaces'
import {
  AdminBody,
  AdminCaption,
  AdminPage,
  AdminSurfaceTitle,
  adminTypography,
} from '@/components/admin/typography'
import { ClientExceptionTable } from '@/components/vaults/client-exception-table'
import { DeploymentQueue } from '@/components/vaults/deployment-queue'
import { MovementLedger } from '@/components/vaults/movement-ledger'
import { RebalancingQueue } from '@/components/vaults/rebalancing-queue'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { entityHref } from '@/components/vaults/vault-entity-link'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { VaultSummaryCard } from '@/components/vaults/vault-summary-card'
import { requireSession } from '@/lib/auth'
import { BACKEND_ENDPOINTS } from '@/lib/backend/endpoints'
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format'
import type { ResolvedStatus } from '@/lib/resolved'
import type { Role } from '@/lib/session'
import {
  REBALANCING_THRESHOLD_BPS,
  available,
  combine,
  isAvailable,
  mapAvailability,
  parseVaultId,
  requiresRebalancing,
  unavailable,
  type Availability,
  type SourceHealth,
  type Strategy,
  type Vault,
} from '@/lib/vaults/model'
import { loadVault } from '@/lib/vaults/registry'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * One vault, read end to end.
 *
 * ── What this page is ─────────────────────────────────────────────────────
 * The operating model says an admin thinks in vaults: a vault holds
 * strategies, belongs to a client, receives deployments, drifts from its
 * targets and emits movements. This page is that object, in that order —
 * summary, allocation, deployments, rebalancing, movements, ownership, and
 * finally the state of the sources it was all read from.
 *
 * Every section reads from ONE registry load. The registry is what joins the
 * six endpoints into a single consistent picture; calling them per section
 * would let two sections of the same page disagree about the same vault.
 *
 * ── An unknown identifier is a 404, not an empty shell ────────────────────
 * `loadVault` returns `vault: null` when nothing in the register carries that
 * identifier. Rendering the page anyway — headings, empty cards, "Unavailable"
 * everywhere — would say "this vault exists and cannot be read", which is a
 * different and false claim from "there is no such vault". So it is
 * `notFound()`.
 *
 * ── How much of this page is an absence, and why that is correct ──────────
 * A large part. `GET /api/v1/deployments`, `/clients` and `/compliance` do not
 * exist on this deployment (404, verified 2026-07-28), and
 * `rebalancing/status` answers `not_exposed_by_contract`. None of that is a
 * defect to hide behind a dash or a zero: each absence is rendered with the
 * word "Unavailable", the reason the service gave when it gave one, and the
 * route that would answer it. The single technical explanation is linked once
 * per section at most, and always to Data coverage.
 */

/* ── Route ────────────────────────────────────────────────────────────────── */

type PageProps = Readonly<{ params: Promise<{ vaultId: string }> }>

/**
 * The tab title is derived from the ROUTE PARAMETER, not from a reading.
 *
 * A vault identifier carries its chain and its contract, so its short form is
 * a description of the object rather than an invented name — and deriving it
 * here costs no extra call to the service before the page itself runs.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vaultId } = await params
  const parsed = parseVaultId(vaultId)
  if (parsed === null) return { title: 'Vault' }
  const short = formatAddress(parsed.contractAddress)
  return { title: short === null ? 'Vault' : `Vault ${short}` }
}

/* ── Shared vocabulary ────────────────────────────────────────────────────── */

/** The console's tolerance, expressed the way every surface reads it: in points. */
const THRESHOLD_POINTS = formatNumber(REBALANCING_THRESHOLD_BPS / 100, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INLINE_LINK =
  'text-xs font-medium text-accent-600 underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:text-accent-400'

/** The one technical explanation any section on this page links to. */
const COVERAGE_HREF = entityHref('source', 'vault')

const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Space owner',
  ADMIN: 'Administrator',
  MEMBER: 'Member',
}

/**
 * An atomic amount rendered only when the denomination asset is known too.
 *
 * `1177864000000` is $1.18M at six decimals and $1.18 at twelve. So the scale
 * always comes from the asset block the SERVICE reported for this vault, and a
 * vault whose asset could not be read renders Unavailable rather than a figure
 * scaled by a guess.
 */
function amountOf(vault: Vault, atomic: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, atomic, (asset, raw) => {
    const formatted = formatCurrency(raw.toString(), { unit: '', fromAtomic: 10 ** asset.decimals })
    return `${formatted} ${asset.symbol}`
  })
}

/**
 * A drift is a gap between two shares, so it reads in signed POINTS —
 * "+2.15 pt". Raw basis points are the wire format, not a figure an operator
 * compares against a threshold at a glance.
 */
function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} pt`
}

/* ── Fact primitives ──────────────────────────────────────────────────────── */

function FactShell({
  label,
  hint,
  children,
}: Readonly<{ label: string; hint?: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0">
      <dt className={adminTypography.label}>{label}</dt>
      <dd className="mt-1.5 min-w-0">
        {children}
        {hint === undefined ? null : <AdminCaption className="mt-1">{hint}</AdminCaption>}
      </dd>
    </div>
  )
}

function FactValue({ children, warn }: Readonly<{ children: React.ReactNode; warn?: boolean }>) {
  return (
    <p
      className={clsx(
        'truncate text-sm font-medium tabular-nums',
        warn === true ? 'text-warning-600 dark:text-warning-400' : 'text-zinc-950 dark:text-white',
      )}
    >
      {children}
    </p>
  )
}

/** A reading the service either produced, or did not. There is no third rendering. */
function Fact({
  label,
  hint,
  value,
  warn,
}: Readonly<{ label: string; hint?: string; value: Availability<string>; warn?: boolean }>) {
  return (
    <FactShell label={label} hint={hint}>
      {isAvailable(value) ? (
        <FactValue warn={warn}>{value.value}</FactValue>
      ) : (
        <SourceAvailabilityBadge availability={value} />
      )}
    </FactShell>
  )
}

/**
 * A fact this console holds directly — the signed-in identity, its role.
 *
 * It is deliberately NOT wrapped in an `Availability`: doing so would make the
 * page claim a provenance for it, and the session cookie is not one of the
 * service's sources.
 */
function SessionFact({
  label,
  hint,
  value,
}: Readonly<{ label: string; hint?: string; value: string }>) {
  return (
    <FactShell label={label} hint={hint}>
      <FactValue>{value}</FactValue>
    </FactShell>
  )
}

/* ── 1 · Summary ──────────────────────────────────────────────────────────── */

/**
 * Capacity and share value — the vault readings the summary card does not
 * carry, and the ones the register explicitly promises are "reported on each
 * vault page".
 *
 * Capacity remaining is headroom under the contractual TVL cap, which is a
 * different fact from idle capital in the summary card next to it. Both are
 * real, both are frequently confused, so each says on screen which one it is.
 */
function CapacityCard({ vault }: Readonly<{ vault: Vault }>) {
  return (
    <AdminSurface padding>
      <AdminSurfaceTitle>Capacity and share value</AdminSurfaceTitle>
      <AdminCaption className="mt-1">
        Room left under the contractual deposit cap — subscription headroom, not capital sitting idle.
      </AdminCaption>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
        <Fact label="TVL cap" value={amountOf(vault, vault.tvlCapAtomic)} />
        <Fact label="Capacity remaining" value={amountOf(vault, vault.capacityRemainingAtomic)} />
        <Fact
          label="Utilization"
          value={mapAvailability(vault.utilizationBps, (bps) =>
            formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 }),
          )}
          hint="Of the cap, not of the allocation."
        />
        <Fact
          label="NAV per share"
          value={combine(vault.asset, vault.navPerShare, (asset, nav) => `${nav} ${asset.symbol}`)}
        />
      </dl>
    </AdminSurface>
  )
}

/* ── 2 · Allocation ───────────────────────────────────────────────────────── */

/**
 * The pocket's own variance against its target.
 *
 * The contract's `driftBps` is preferred when it publishes one; otherwise the
 * gap is computed from the two shares the same service reported for the same
 * pocket. A pocket whose actual share was not readable yields no variance at
 * all — not a variance of zero, which would state that it is exactly on target.
 */
function varianceBpsOf(strategy: Strategy): number | null {
  if (strategy.driftBps !== null) return strategy.driftBps
  if (strategy.actualBps === null) return null
  return strategy.actualBps - strategy.targetBps
}

/** What the contract says about the pocket itself, in one word. */
function pocketState(strategy: Strategy): string {
  if (!strategy.enabled) return 'Disabled'
  if (strategy.isIdle) return 'Idle pocket'
  return 'Active'
}

const HEAD_CELL = 'px-4 py-3 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-4 py-3 align-top'

function AllocationTable({ vault, strategies }: Readonly<{ vault: Vault; strategies: readonly Strategy[] }>) {
  return (
    <AdminSurface>
      <div className="px-5 pt-5 pb-4 sm:px-6">
        <AdminSurfaceTitle>Strategy pockets</AdminSurfaceTitle>
        <AdminCaption className="mt-1">
          Each pocket against the share the contract assigns it, and what it currently holds.
        </AdminCaption>
      </div>

      <div className="overflow-x-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">
            Strategy pockets of this vault, with their target and actual share, their variance, the
            value they hold and their contract state.
          </caption>
          <thead>
            <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
              <th scope="col" className={clsx(HEAD_CELL, 'pl-5 sm:pl-6')}>
                Pocket
              </th>
              <th scope="col" className={clsx(HEAD_CELL, 'text-right')}>
                Target
              </th>
              <th scope="col" className={clsx(HEAD_CELL, 'text-right')}>
                Actual
              </th>
              <th scope="col" className={clsx(HEAD_CELL, 'text-right')}>
                Variance
              </th>
              <th scope="col" className={HEAD_CELL}>
                Current value
              </th>
              <th scope="col" className={clsx(HEAD_CELL, 'pr-5 sm:pr-6')}>
                State
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
            {strategies.map((strategy) => {
              const variance = varianceBpsOf(strategy)
              const breached = variance !== null && Math.abs(variance) >= REBALANCING_THRESHOLD_BPS
              const held = amountOf(vault, strategy.assetsAtomic)

              return (
                /*
                  The row id is the anchor `entityHref('strategy', id)` builds —
                  `/admin/vaults/{vaultId}#strategy-{pocket}`. It has to match
                  character for character, so it is derived from the pocket key
                  the contract returned and from nothing else.
                */
                <tr
                  key={strategy.id}
                  id={`strategy-${strategy.pocket}`}
                  className="scroll-mt-24 hover:bg-zinc-950/[0.03] target:bg-accent-500/10 dark:hover:bg-white/[0.03]"
                >
                  <td className={clsx(BODY_CELL, 'pl-5 sm:pl-6')}>
                    <span className="block font-medium text-zinc-950 dark:text-white">{strategy.label}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-500">
                      {strategy.adapter === null
                        ? strategy.pocket
                        : `${strategy.pocket} · ${formatAddress(strategy.adapter) ?? strategy.adapter}`}
                    </span>
                  </td>

                  <td className={clsx(BODY_CELL, 'text-right tabular-nums text-zinc-950 dark:text-zinc-300')}>
                    {formatPercent(strategy.targetBps, { fromBps: true, maximumFractionDigits: 2 })}
                  </td>

                  <td className={clsx(BODY_CELL, 'text-right tabular-nums')}>
                    {strategy.actualBps === null ? (
                      <span
                        className="text-zinc-500 dark:text-zinc-400"
                        title="The service reported no actual share for this pocket."
                      >
                        Unavailable
                      </span>
                    ) : (
                      <span className="text-zinc-950 dark:text-zinc-300">
                        {formatPercent(strategy.actualBps, { fromBps: true, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  <td className={clsx(BODY_CELL, 'text-right tabular-nums')}>
                    {variance === null ? (
                      <span
                        className="text-zinc-500 dark:text-zinc-400"
                        title="Neither a drift nor an actual share was reported for this pocket."
                      >
                        Unavailable
                      </span>
                    ) : (
                      // The only place a semantic hue is spent in this table: a
                      // real state claim against the threshold named below it.
                      <span
                        className={clsx(
                          breached ? 'font-medium text-warning-600 dark:text-warning-400' : 'text-zinc-950 dark:text-zinc-300',
                        )}
                        title={breached ? `Beyond this console's ±${THRESHOLD_POINTS} pt threshold` : undefined}
                      >
                        {driftPoints(variance)}
                      </span>
                    )}
                  </td>

                  <td className={BODY_CELL}>
                    {isAvailable(held) ? (
                      <span className="tabular-nums text-zinc-950 dark:text-white">{held.value}</span>
                    ) : (
                      <SourceAvailabilityBadge availability={held} compact />
                    )}
                  </td>

                  <td className={clsx(BODY_CELL, 'pr-5 sm:pr-6 text-zinc-600 dark:text-zinc-300')}>
                    {pocketState(strategy)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/*
        Two things the columns cannot say for themselves, said once, on screen:
        whose threshold colours the variance, and why a pocket that reports an
        amount can still show no current value.
      */}
      <div className="space-y-1 px-5 pt-4 pb-5 sm:px-6">
        <AdminCaption>
          A variance is coloured only past this console&rsquo;s ±{THRESHOLD_POINTS} pt tolerance. The
          contract publishes none of its own.
        </AdminCaption>
        <AdminCaption>
          Current value is carried through only when the amount the service reports for a pocket agrees
          with the share it reports for the same pocket. Where the two contradict each other the value is
          unavailable — neither reading is preferred, and neither is corrected.{' '}
          <Link href={COVERAGE_HREF} className={INLINE_LINK}>
            Data coverage
          </Link>
        </AdminCaption>
      </div>
    </AdminSurface>
  )
}

/* ── 2 · Allocation section wrapper ─────────────────────────────────────── */

function AllocationSection({
  vault,
  strategies,
}: Readonly<{ vault: Vault; strategies: Availability<readonly Strategy[]> }>) {
  let contenu: React.ReactNode
  if (isAvailable(strategies)) {
    if (strategies.value.length === 0) {
      contenu = (
        <AbsenceCard
          title="This vault declares no strategy pocket."
          sentence="The service answered and returned an empty pocket list. That is an unallocated vault, not a reading that failed."
          availability={strategies}
        />
      )
    } else {
      contenu = <AllocationTable vault={vault} strategies={strategies.value} />
    }
  } else {
    contenu = (
      <AbsenceCard
        title="The allocation could not be read."
        sentence="No pocket was returned for this vault, so nothing is listed. An unread allocation is not an empty one, and no share is shown as zero."
        availability={strategies}
      />
    )
  }

  return (
    <AdminSection
      title="Allocation"
      description="Where the vault's capital is placed, pocket by pocket, against the shares the contract targets."
    >
      {contenu}
    </AdminSection>
  )
}

/* ── 4 · Rebalancing ──────────────────────────────────────────────────────── */

/**
 * The contract's own last-rebalance timestamp.
 *
 * `rebalancing/status` answers UNAVAILABLE with `not_exposed_by_contract` on
 * this deployment, so the normal outcome is an absence. The branch that reads
 * an available block carrying a null date is kept for the day the contract
 * starts publishing one: an answered call without a date is still an absence,
 * not a blank.
 */
function lastRebalanceReading(vault: Vault): Availability<string> {
  if (!isAvailable(vault.rebalancing)) return vault.rebalancing
  const at = vault.rebalancing.value.lastRebalanceAt
  if (at === null) {
    return unavailable({ status: 'EMPTY', endpoint: '/api/v1/rebalancing/status' })
  }
  return available(`${formatDateTime(at)} · ${formatRelativeTime(at)}`, {
    provenance: vault.rebalancing.provenance,
    asOf: vault.rebalancing.asOf,
    stale: vault.rebalancing.stale,
  })
}

/**
 * What the admin has to do about this vault.
 *
 * "None" is a positive claim, so it is only made when a drift was genuinely
 * measured. An unreadable drift yields no instruction at all — an unknown is
 * not a cleared item.
 */
function PendingActionTile({ vault }: Readonly<{ vault: Vault }>) {
  const breaches = requiresRebalancing(vault)

  return (
    <AdminSurface className="p-4">
      <dl>
        <FactShell label="Pending action">
          {!isAvailable(breaches) ? (
            <>
              <SourceAvailabilityBadge availability={breaches} />
              <AdminCaption className="mt-1">
                No drift reading, so no action is recommended either way.
              </AdminCaption>
            </>
          ) : breaches.value ? (
            <>
              <FactValue warn>Rebalance review</FactValue>
              <p className="mt-1">
                <Link href={entityHref('keeper', vault.id)} className={INLINE_LINK}>
                  Open Keeper
                </Link>
              </p>
            </>
          ) : (
            <>
              <FactValue>None</FactValue>
              <AdminCaption className="mt-1">
                Every pocket that reported sits inside the ±{THRESHOLD_POINTS} pt threshold.
              </AdminCaption>
            </>
          )}
        </FactShell>
      </dl>
    </AdminSurface>
  )
}

/* ── 7 · Source status ────────────────────────────────────────────────────── */

/**
 * `endpointById` throws on an unknown id — right for the registry, wrong on a
 * render path, where a source the loader names but the endpoint registry does
 * not would take the whole page down. The path is looked up leniently and
 * simply omitted when there is no entry for it.
 */
function endpointPath(id: string): string | null {
  const found = BACKEND_ENDPOINTS.find((endpoint) => endpoint.id === id)
  return found === undefined ? null : found.path
}

/**
 * Every status the model can carry, in one word each.
 *
 * The map is exhaustive rather than defaulted: a status added to
 * `ResolvedStatus` tomorrow fails the type check here instead of reaching the
 * screen as a raw enum name.
 */
const SOURCE_STATUS_WORD: Record<ResolvedStatus | 'NOT_EXPOSED', string> = {
  LIVE: 'Available',
  STALE: 'Stale',
  PARTIAL: 'Partial',
  EMPTY: 'Empty',
  NOT_CONFIGURED: 'Not configured',
  UNAVAILABLE: 'Unavailable',
  NOT_SUPPORTED: 'Not supported',
  PERMISSION_DENIED: 'Access denied',
  SIMULATED: 'Backend simulation',
  ERROR: 'Error',
  NOT_EXPOSED: 'Not exposed',
}

/**
 * The source strip — compact by instruction, and by argument.
 *
 * The technical account of WHY a source answers the way it does belongs to
 * Data coverage; repeating it per row here would turn the bottom of every
 * vault page into a second diagnostics screen. So: one line per source, and
 * one link out.
 *
 * A filled dot marks a source that answered with a reading, a hollow ring
 * marks one that did not — the same shape convention the availability badge
 * uses, so the two never contradict each other visually.
 */
function SourceStatus({ sources }: Readonly<{ sources: readonly SourceHealth[] }>) {
  return (
    <AdminSurface>
      <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        {sources.map((source) => {
          const path = endpointPath(source.endpointId)
          const live = source.status === 'LIVE'

          return (
            <li
              key={source.endpointId}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5 sm:px-6"
            >
              <span className="text-sm font-medium text-zinc-950 dark:text-white">{source.label}</span>
              {path === null ? null : (
                <span className="truncate font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-500">{path}</span>
              )}

              <span className="ml-auto flex shrink-0 items-center gap-x-4">
                {source.asOf === null ? null : (
                  <span
                    className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400"
                    title={formatDateTime(source.asOf)}
                  >
                    {formatRelativeTime(source.asOf)}
                  </span>
                )}
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 text-xs whitespace-nowrap',
                    live ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'size-1.5 shrink-0 rounded-full',
                      live ? 'bg-accent-600 dark:bg-accent-400' : 'ring-1 ring-current',
                    )}
                  />
                  {SOURCE_STATUS_WORD[source.status]}
                </span>
              </span>

              {source.detail === null ? null : (
                <span className="w-full font-mono text-[0.6875rem]/4 break-all text-zinc-500 dark:text-zinc-500">
                  {source.detail}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <AdminCaption className="px-5 py-3 sm:px-6">
        Freshness is the timestamp the source itself reported.{' '}
        <Link href={COVERAGE_HREF} className={INLINE_LINK}>
          Data coverage
        </Link>{' '}
        explains what each source serves and why the rest is not exposed.
      </AdminCaption>
    </AdminSurface>
  )
}

/* ── A named absence, used wherever a whole section has no source ─────────── */

function AbsenceCard({
  title,
  sentence,
  availability,
}: Readonly<{ title: string; sentence: string; availability: Availability<unknown> }>) {
  return (
    <AdminSurface>
      <div className="px-5 py-5 sm:px-6">
        <AdminSurfaceTitle as="p">{title}</AdminSurfaceTitle>
        <AdminBody className="mt-1.5 max-w-prose">{sentence}</AdminBody>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <SourceAvailabilityBadge availability={availability} />
          <Link href={COVERAGE_HREF} className={INLINE_LINK}>
            Data coverage
          </Link>
        </div>
      </div>
    </AdminSurface>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

/**
 * Compliance has no endpoint at all on this deployment — `/api/v1/compliance`
 * is a 404. The absence names the route that would answer it and carries no
 * machine reason, because no service produced one: attributing a reason string
 * to a service that was never able to answer would put words in its mouth.
 */
const COMPLIANCE: Availability<string> = unavailable({
  endpoint: '/api/v1/compliance',
  status: 'NOT_EXPOSED',
})

/**
 * Per-vault permissions likewise have no source. The console knows the role
 * the SESSION carries — which is real, and rendered as such next to this — but
 * "who may act on this vault" is a statement about the vault, and nothing
 * publishes it. No endpoint is named either: there is no route to point at.
 */
const VAULT_PERMISSIONS: Availability<string> = unavailable({ status: 'NOT_EXPOSED' })

export default async function Page({ params }: PageProps) {
  const { vaultId } = await params
  const session = await requireSession()
  // Next decodes the route segment already; `entityHref` encodes it on the way
  // out, so the identifier that arrives here is the one the model produced.
  const { registry, vault } = await loadVault(vaultId, session.name)

  if (vault === null) notFound()

  /* Everything below is scoped to THIS vault, by identifier — never by label:
     two vaults can share a display name, and a join by name would attribute
     another vault's movements to this one. */
  const scopedVaults: Availability<readonly Vault[]> = mapAvailability(registry.vaults, (list) =>
    list.filter((candidate) => candidate.id === vault.id),
  )
  const scopedDeployments = mapAvailability(registry.deployments, (list) =>
    list.filter((deployment) => deployment.vaultId === vault.id),
  )
  const scopedRebalancing = mapAvailability(registry.rebalancing, (rows) =>
    rows.filter((row) => row.vaultId === vault.id),
  )
  const scopedMovements = mapAvailability(registry.movements, (list) =>
    list.filter((movement) => movement.vaultId === vault.id),
  )

  /* A ledger that indexed movements, none of which belong to this vault, is a
     different fact from a ledger that indexed nothing — and `MovementLedger`
     can only say the second, because it never sees the unfiltered list. */
  const ledgerIsEmptyForThisVault =
    isAvailable(registry.movements) &&
    isAvailable(scopedMovements) &&
    registry.movements.value.length > 0 &&
    scopedMovements.value.length === 0

  const strategies = vault.strategies
  const worstDrift = vault.worstDriftBps
  const worstDriftBreached = isAvailable(worstDrift) && Math.abs(worstDrift.value) >= REBALANCING_THRESHOLD_BPS

  return (
    <AdminPage>
      <PageHeader
        title={vault.label}
        description="One vault, read end to end: what it holds, how it is allocated, what has moved through it, and which of those readings the service is currently in a position to make."
      />

      {/* 1 · Summary — the identity card on eight columns, the capacity block
          on four. Neither is forced to the other's height: the grid is
          top-aligned, so each card ends where its content ends. */}
      <AdminSection
        title="Summary"
        description="What the vault is, who it belongs to, and what it holds."
        actions={<VaultStatusBadge status={vault.status} />}
      >
        <AdminGrid>
          <AdminCol span={8}>
            <VaultSummaryCard vault={vault} />
          </AdminCol>
          <AdminCol span={4}>
            <CapacityCard vault={vault} />
          </AdminCol>
        </AdminGrid>
      </AdminSection>

      {/* 2 · Allocation */}
      <AllocationSection vault={vault} strategies={strategies} />

      {/* 3 · Deployments */}
      <AdminSection
        title="Deployments"
        description="Capital placed into this vault's strategies, and the ledger that would record who placed it."
      >
        <DeploymentQueue deployments={scopedDeployments} vaults={scopedVaults} />
      </AdminSection>

      {/* 4 · Rebalancing — three vault-level facts, then the pocket-by-pocket
          queue at full width, because it is an eight-column table. */}
      <AdminSection
        title="Rebalancing"
        description={`How far this vault has drifted from its targets, read against this console's ±${THRESHOLD_POINTS} pt tolerance — a convention of this console, not a rule the contract publishes.`}
      >
        <AdminMetricGrid count={3}>
          <AdminSurface className="p-4">
            <dl>
              <Fact
                label="Current drift"
                value={mapAvailability(worstDrift, driftPoints)}
                warn={worstDriftBreached}
                hint="The widest gap between a pocket's target and its actual share."
              />
            </dl>
          </AdminSurface>

          <AdminSurface className="p-4">
            <dl>
              <Fact
                label="Last rebalance"
                value={lastRebalanceReading(vault)}
                hint="Published by the contract, when it publishes one."
              />
            </dl>
          </AdminSurface>

          <PendingActionTile vault={vault} />
        </AdminMetricGrid>

        <RebalancingQueue rows={scopedRebalancing} />
      </AdminSection>

      {/* 5 · Movements */}
      <AdminSection
        title="Movements"
        description="Chain events the indexer attributes to this vault's contract. Events on other contracts are not listed here."
      >
        {ledgerIsEmptyForThisVault ? (
          <AdminSurface>
            <div className="px-5 py-5 sm:px-6">
              <AdminSurfaceTitle as="p">No movement is attributed to this vault.</AdminSurfaceTitle>
              <AdminBody className="mt-1.5 max-w-prose">
                The ledger answered and returned{' '}
                {isAvailable(registry.movements) ? formatNumber(registry.movements.value.length) : null} movements, none
                of which names this vault&rsquo;s contract. This vault has no indexed movement — the ledger itself is
                not empty.
              </AdminBody>
            </div>
          </AdminSurface>
        ) : (
          <MovementLedger movements={scopedMovements} vaults={scopedVaults} limit={25} />
        )}
      </AdminSection>

      {/* 6 · Compliance and ownership — two cards of equal weight, and the
          split IS the point: the left card is what this console knows for
          certain, the right card is what the service cannot tell it. */}
      <AdminSection
        title="Compliance and ownership"
        description="Who is looking at this vault, and what the service can say about whose vault it is."
      >
        <AdminGrid>
          <AdminCol span={6}>
            <AdminSurface padding>
              <AdminSurfaceTitle>From your session</AdminSurfaceTitle>
              <AdminCaption className="mt-1">
                Held by this console, not read from the vault: it describes the account viewing the page.
              </AdminCaption>
              <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <SessionFact label="Account owner" value={session.name} />
                <SessionFact label="Signed in as" value={session.email} />
                <SessionFact label="Console role" value={ROLE_LABEL[session.role]} />
                <Fact
                  label="Permissions on this vault"
                  value={VAULT_PERMISSIONS}
                  hint="The service publishes no per-vault access control, so the console makes no claim about one."
                />
              </dl>
            </AdminSurface>
          </AdminCol>

          <AdminCol span={6}>
            <AdminSurface padding>
              <AdminSurfaceTitle>From the service</AdminSurfaceTitle>
              <AdminCaption className="mt-1">
                Read from the backend — and today, not readable at all.
              </AdminCaption>
              <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Fact
                  label="Related client"
                  value={mapAvailability(vault.client, (client) => client.label)}
                  hint="No client directory is exposed, so the vault's owner is not readable — which is a different fact from it having none."
                />
                <Fact
                  label="Compliance status"
                  value={COMPLIANCE}
                  hint="No compliance review is served for this vault or for any other."
                />
              </dl>
            </AdminSurface>
          </AdminCol>
        </AdminGrid>

        {/* The one client-side work item this service can actually attest —
            `no_investor_record` on the signed-in account — surfaces here
            rather than being restated in prose. When there is nothing to
            attest the component says so in its own words, and never claims
            that no exception exists. */}
        <ClientExceptionTable exceptions={registry.clientExceptions} />
      </AdminSection>

      {/* 7 · Source status */}
      <AdminSection
        title="Source status"
        description="Which service answered for this page, and how fresh its reading was."
      >
        <SourceStatus sources={registry.sources} />
      </AdminSection>
    </AdminPage>
  )
}
