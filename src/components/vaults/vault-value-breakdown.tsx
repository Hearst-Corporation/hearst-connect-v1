import Link from 'next/link'

import { AdminEmptyState, AdminSurface } from '@/components/admin/surfaces'
import { AdminCaption, AdminLabel, AdminSurfaceTitle } from '@/components/admin/typography'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { entityHref } from '@/components/vaults/vault-entity-link'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { valueOf, type Availability, type Vault } from '@/lib/vaults/model'

/**
 * Where the value sits, vault by vault.
 *
 * ── Why bars, and why not a pie ───────────────────────────────────────────
 * The question this answers is "how much is in each vault, and how big is
 * that against the rest". A horizontal bar answers it with a length the eye
 * compares directly and a figure printed next to it; a pie replaces the
 * figure with an angle and needs a legend to say whose slice is whose. So:
 * bars, sorted by value, each labelled with its own amount.
 *
 * ── Why some vaults have no bar ───────────────────────────────────────────
 * A vault whose total the service could not read is listed WITHOUT a bar and
 * excluded from the total, because a length of zero would state that it holds
 * nothing. It is still listed: silently dropping it would understate the
 * register, which is the same lie told the other way round.
 */

/** Atomic units scale by the decimals the SERVICE reports, never by assumption. */
function assetScale(vault: Vault): number | undefined {
  const asset = valueOf(vault.asset)
  if (asset === null) return undefined
  return 10 ** asset.decimals
}

const ZERO = BigInt(0)
/** Basis-point denominator, as a bigint. (`10_000n` needs an ES2020 target.) */
const BPS = BigInt(10000)

type Measured = Readonly<{ vault: Vault; atomic: bigint }>

/* ── Bar ──────────────────────────────────────────────────────────────────── */

/**
 * One vault's share of the readable total.
 *
 * The measurement is the mint accent and the track is neutral graphite: value
 * is ordinary data, so no semantic tone is spent on it. The only status colour
 * on the row comes from `VaultStatusBadge`, which is an actual state claim.
 */
function ValueBar({ percent }: Readonly<{ percent: number | null }>) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-console-inset">
      {percent === null ? null : (
        <div
          className="h-full rounded-full bg-accent-500 dark:bg-accent-400"
          // The width IS the datum, so it cannot be a class: Tailwind only
          // emits classes it can read in the source text.
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  )
}

/* ── Breakdown ────────────────────────────────────────────────────────────── */

export function VaultValueBreakdown({ vaults }: Readonly<{ vaults: Availability<readonly Vault[]> }>) {
  const list = valueOf(vaults)

function texteAbsence(list: readonly Vault[] | null): string {
  if (list === null) return 'The vault reading did not resolve.'
  return 'The service answered without a vault.'
}

  if (list === null || list.length === 0) {
    return (
      <AdminSurface className="flex h-full flex-col">
        <AdminEmptyState
          title="No vault value."
          description={texteAbsence(list)}
        >
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SourceAvailabilityBadge availability={vaults} />
            <Link
              href={entityHref('source', 'vault')}
              className="text-xs text-accent-600 underline-offset-4 hover:underline dark:text-accent-400"
            >
              Data coverage
            </Link>
          </div>
        </AdminEmptyState>
      </AdminSurface>
    )
  }

  const measured: Measured[] = []
  const unmeasured: Vault[] = []
  for (const vault of list) {
    const atomic = valueOf(vault.totalAssetsAtomic)
    if (atomic === null) unmeasured.push(vault)
    else measured.push({ vault, atomic: BigInt(atomic) })
  }

  // Highest value first — the ordering IS part of the reading.
  const ranked = [...measured].sort((a, b) => {
    if (a.atomic < b.atomic) return 1
    if (a.atomic > b.atomic) return -1
    return 0
  })
  const total = ranked.reduce((sum, entry) => sum + entry.atomic, ZERO)

  // Every vault answered, and none of them with a value: the honest report is
  // an absence, not a chart of empty bars.
  if (ranked.length === 0) {
    return (
      <AdminSurface className="flex h-full flex-col">
        <div className="px-5 pt-5 pb-4 sm:px-6">
          <AdminSurfaceTitle>Value by vault</AdminSurfaceTitle>
        </div>
        <AdminEmptyState
          title="Vault values unavailable."
          description="The register lists vaults, but none carried a readable total."
        >
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {unmeasured.map((vault) => (
              <SourceAvailabilityBadge key={vault.id} availability={vault.totalAssetsAtomic} compact />
            ))}
          </div>
        </AdminEmptyState>
      </AdminSurface>
    )
  }

  // Scale a bar to the largest reading, so the widest bar fills the row and
  // the differences between the others stay visible. The PRINTED share is
  // always the share of the total — the length is a comparison aid, the
  // number is the measurement.
  const largest = ranked[0].atomic

  return (
    <AdminSurface className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-4 pb-3 sm:px-5">
        <div>
          <AdminSurfaceTitle className="text-sm/5">Value by vault</AdminSurfaceTitle>
        </div>
        <div className="text-right">
          <AdminLabel>Readable total</AdminLabel>
          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(total.toString(), { fromAtomic: assetScale(ranked[0].vault) })}
          </p>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        {ranked.map(({ vault, atomic }) => {
          const percent = total > ZERO ? Number((atomic * BPS) / total) / 100 : null
          const width = total > ZERO && largest > ZERO ? Number((atomic * BPS) / largest) / 100 : null

          return (
            /*
              The whole row opens the vault. A link inside a link is invalid
              HTML, so the row carries ONE anchor stretched over it rather
              than wrapping its contents; badges sit under that anchor and
              stay part of the click target.
            */
            <li key={vault.id} className="relative px-4 py-2.5 hover:bg-zinc-950/3 sm:px-5 dark:hover:bg-white/3">
              <Link
                href={entityHref('vault', vault.id)}
                className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-400"
              >
                <span className="sr-only">Open {vault.label}</span>
              </Link>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 truncate text-sm font-medium text-zinc-950 dark:text-white">{vault.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-950 dark:text-white">
                  {formatCurrency(atomic.toString(), { fromAtomic: assetScale(vault) })}
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {percent === null ? '—' : formatPercent(percent)}
                  </span>
                </span>
              </div>

              <ValueBar percent={width} />

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <VaultStatusBadge status={vault.status} />
              </div>
            </li>
          )
        })}
      </ul>

      {unmeasured.length > 0 ? (
        <div className="space-y-2 px-4 pt-3 pb-4 sm:px-5">
          <AdminCaption>Excluded from total: {formatNumber(unmeasured.length)} unread vaults.</AdminCaption>
          <ul className="space-y-1.5">
            {unmeasured.map((vault) => (
              <li key={vault.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={entityHref('vault', vault.id)}
                  className="text-sm text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  {vault.label}
                </Link>
                <SourceAvailabilityBadge availability={vault.totalAssetsAtomic} compact />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AdminSurface>
  )
}
