import { AdminSurface } from '@/components/admin/surfaces'
import { AdminCaption, AdminSurfaceTitle, adminTypography } from '@/components/admin/typography'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { VaultEntityLink } from '@/components/vaults/vault-entity-link'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { formatAddress, formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format'
import {
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  mapAvailability,
  unavailable,
  type Availability,
  type Vault,
} from '@/lib/vaults/model'

/**
 * The Summary block of a vault's detail page.
 *
 * Every figure here is an `Availability`, and that is the point: the same card
 * renders "$1,177,864.00 USDC" and "Unavailable · /api/v1/clients" through the
 * same slot, so an absence can never be mistaken for a small number.
 *
 * ── Why the amounts go through `combine` ─────────────────────────────────
 * An atomic amount is meaningless without the denomination asset's decimals: a
 * reading of `1177864000000` is $1.18M at six decimals and $1.18 at twelve.
 * So every amount is combined with `vault.asset`, and a vault whose asset the
 * service did not report renders Unavailable rather than a figure scaled by a
 * guess.
 *
 * Deployed and idle capital come from `deployedAtomic` / `idleAtomic`, which
 * are themselves combinations of the vault total and the pockets' summed
 * share. If either operand is missing they stay unavailable — a pocket the
 * service could not read must not silently become idle capital.
 *
 * ── Why the absences render in their full form ───────────────────────────
 * This card is where a reader comes to ask "why can't I see this number?", so
 * the badge shows the reason and the endpoint rather than the dense one-line
 * form used inside tables.
 */

/**
 * The vault contract publishes no creation timestamp, and the console has no
 * other source for one.
 *
 * The tempting substitute is the first movement in the ledger — but "when the
 * indexer first saw this vault move" is a different fact from "when the vault
 * was created", and presenting one as the other is exactly the kind of quiet
 * invention this product exists to avoid.
 */
const CREATED_AT: Availability<string> = unavailable({
  status: 'NOT_EXPOSED',
  reason: 'no_creation_timestamp',
  endpoint: '/api/v1/vault',
})

/** An atomic amount, rendered only when the denomination asset is known too. */
function amountOf(vault: Vault, atomic: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, atomic, (asset, raw) => {
    const formatted = formatCurrency(raw.toString(), { unit: '', fromAtomic: 10 ** asset.decimals })
    return `${formatted} ${asset.symbol}`
  })
}

/* ── Fields ───────────────────────────────────────────────────────────────── */

function Field({
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

/** A value the service either read, or did not. There is no third rendering. */
function TextField({
  label,
  hint,
  value,
}: Readonly<{ label: string; hint?: string; value: Availability<string> }>) {
  return (
    <Field label={label} hint={hint}>
      {isAvailable(value) ? (
        <p className="truncate text-sm font-medium text-zinc-950 tabular-nums dark:text-white" title={value.value}>
          {value.value}
        </p>
      ) : (
        <SourceAvailabilityBadge availability={value} />
      )}
    </Field>
  )
}

/** Same contract, for a value that renders as a link rather than as text. */
function NodeField({
  label,
  hint,
  availability,
  children,
}: Readonly<{
  label: string
  hint?: string
  availability: Availability<unknown>
  children: React.ReactNode
}>) {
  return (
    <Field label={label} hint={hint}>
      {isAvailable(availability) ? children : <SourceAvailabilityBadge availability={availability} />}
    </Field>
  )
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

export function VaultSummaryCard({ vault }: Readonly<{ vault: Vault }>) {
  const address = formatAddress(vault.contractAddress)
  const client = vault.client

  const lastActivity = mapAvailability(
    vault.lastActivityAt,
    (iso) => `${formatDateTime(iso)} · ${formatRelativeTime(iso)}`,
  )

  return (
    <AdminSurface padding>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <AdminSurfaceTitle>{vault.label}</AdminSurfaceTitle>
          <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400" title={vault.contractAddress}>
            {[
              vault.chainId === null ? null : `chain ${vault.chainId}`,
              address ?? vault.contractAddress,
            ]
              .filter((part) => part !== null)
              .join(' · ')}
          </p>
        </div>
        <VaultStatusBadge status={vault.status} />
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <NodeField
          label="Client"
          availability={client}
          hint={isAvailable(client) ? undefined : 'No client directory is exposed today.'}
        >
          {isAvailable(client) ? (
            <VaultEntityLink kind="client" id={client.value.id} label={client.value.label} />
          ) : null}
        </NodeField>

        <TextField label="Total value" value={amountOf(vault, vault.totalAssetsAtomic)} />

        <TextField
          label="Deployed"
          value={amountOf(vault, deployedAtomic(vault))}
          hint="The pockets' summed share of the vault."
        />

        <TextField
          label="Available (idle in vault)"
          value={amountOf(vault, idleAtomic(vault))}
          hint="Held by the vault and placed in no strategy — not subscription headroom."
        />

        <TextField label="Created" value={CREATED_AT} />

        <TextField label="Last activity" value={lastActivity} />
      </dl>

      <p className="mt-6 truncate border-t border-zinc-950/5 pt-3 font-mono text-[0.6875rem]/4 text-zinc-500 dark:border-console-line dark:text-zinc-500">
        {vault.id}
      </p>
    </AdminSurface>
  )
}
