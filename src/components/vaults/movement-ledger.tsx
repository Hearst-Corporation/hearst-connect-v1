import { Absent as Missing, Panel, gcc } from '@/components/design-lab/green-command-center/primitives'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { explorerTxUrl } from '@/lib/explorer'
import { formatAddress, formatCurrency, formatDateTime, formatHash, formatNumber, formatRelativeTime } from '@/lib/format'
import { libelleMouvement, phraseMouvement } from '@/lib/mouvements'
import {
  isAvailable,
  parseVaultId,
  type Availability,
  type Movement,
  type Vault,
  type VaultId,
} from '@/lib/vaults/model'
import Link from 'next/link'
import clsx from 'clsx'

/**
 * The indexed movement ledger — the one surface of this console backed by
 * genuinely rich data.
 *
 * `GET /api/v1/series1/events` returns real, indexed chain events: what
 * happened, on which block, in which transaction, for which investor address,
 * for how much. Nothing here is derived or smoothed.
 *
 * ── What the ledger does NOT carry, and is rendered as such ───────────────
 * · **Strategy.** `movement.strategyId` is deliberately `unavailable` with the
 *   reason `ledger_carries_no_pocket`: none of the event types this contract
 *   emits names the pocket it touched. A `Rebalance` event plainly concerns
 *   the pockets, and inferring "S0" from that would be a fabricated
 *   relationship — the column says the ledger does not carry it.
 * · **Client.** The only client-side identity on an event is the investor's
 *   wallet address, and no directory resolves an address to a named client
 *   (`/api/v1/clients` is a 404). The address is rendered as an address.
 * · **Status.** The ledger publishes indexation and nothing beyond it. A
 *   deposit is not reported as "settled" or "confirmed" by this source, so
 *   the column reports indexation and the footer says that is all it means.
 *
 * ── Why this surface writes its own table markup ──────────────────────────
 * `AdminTable` renders a `<tr>` this component cannot address, and every row
 * has to carry `id="movement-{id}"` so that `entityHref('movement', id)` —
 * `/admin/operations#movement-{id}` — actually lands on the movement rather
 * than on the top of the page. The classes below are `AdminTable`'s, kept
 * identical on purpose: the difference is the row identity, not the styling.
 */

/** The one link this surface offers to the technical explanation of an absence. */
const DATA_COVERAGE_HREF = entityHref('source', 'data-coverage')

const LINK_CLASS = 'text-accent-600 hover:underline dark:text-accent-400'
const MUTED_CLASS = 'text-zinc-500 dark:text-zinc-400'

/**
 * Atomic units are scaled by the vault's own reported decimals whenever the
 * vault could be read. When it could not, the console falls back to the
 * denomination this deployment is documented in — USDC, six decimals — and
 * the cell says so on hover rather than passing the scale off as measured.
 */
const DOCUMENTED_DECIMALS = 6

/* ── Cells ────────────────────────────────────────────────────────────────── */

/** A vault named from its identifier when no label source answered. */
function vaultShortLabel(id: VaultId): string {
  const parsed = parseVaultId(id)
  if (parsed === null) return id
  return formatAddress(parsed.contractAddress) ?? id
}

function Absent({ title }: Readonly<{ title: string }>) {
  return (
    <span className={MUTED_CLASS} title={title}>
      Unavailable
    </span>
  )
}

function TimeCell({ movement }: Readonly<{ movement: Movement }>) {
  return (
    <>
      {movement.occurredAt === null ? (
        <Absent title="The ledger reported no timestamp for this event." />
      ) : (
        <span className="tabular-nums text-zinc-700 dark:text-zinc-300" title={formatDateTime(movement.occurredAt)}>
          {formatRelativeTime(movement.occurredAt)}
        </span>
      )}
      {movement.blockNumber === null ? null : (
        <span className={clsx('mt-0.5 block font-mono text-xs', MUTED_CLASS)}>block {movement.blockNumber}</span>
      )}
    </>
  )
}

function VaultCell({ movement, vault }: Readonly<{ movement: Movement; vault: Vault | undefined }>) {
  if (movement.vaultId === null) {
    return <Absent title="The event names a contract this console does not recognise as a vault." />
  }
  return (
    <VaultEntityLink
      kind="vault"
      id={movement.vaultId}
      label={vault === undefined ? vaultShortLabel(movement.vaultId) : vault.label}
    />
  )
}

function ClientCell({ movement }: Readonly<{ movement: Movement }>) {
  if (movement.investorAddress === null) {
    return <Absent title="The event carries no investor address." />
  }
  // The address IS the client-side identity here — there is no directory to
  // resolve it to a name, and the link goes where that absence is explained.
  return (
    <VaultEntityLink
      kind="client"
      id={movement.investorAddress}
      label={formatAddress(movement.investorAddress) ?? movement.investorAddress}
      className="font-mono"
    />
  )
}

function AmountCell({ movement, vault }: Readonly<{ movement: Movement; vault: Vault | undefined }>) {
  if (movement.assetAmountAtomic === null) {
    // Most event types carry no amount at all (a strategy being added moves
    // no capital). An absent amount is a dash — never a zero.
    return <span className={MUTED_CLASS}>—</span>
  }

  const measured = vault !== undefined && isAvailable(vault.asset) ? vault.asset.value : null
  const decimals = measured === null ? DOCUMENTED_DECIMALS : measured.decimals
  const title =
    measured === null
      ? `Scaled by the documented ${DOCUMENTED_DECIMALS}-decimal denomination — the vault's own decimals could not be read.`
      : `Scaled by the ${measured.decimals} decimals the vault reports for ${measured.symbol}.`

  return (
    <span className="tabular-nums text-zinc-950 dark:text-white" title={title}>
      {formatCurrency(movement.assetAmountAtomic, { fromAtomic: 10 ** decimals })}
    </span>
  )
}

function TransactionCell({ movement }: Readonly<{ movement: Movement }>) {
  if (movement.txHash === null) return <Absent title="The event carries no transaction hash." />

  const short = formatHash(movement.txHash)
  if (short === null) return <Absent title="The event carries no transaction hash." />

  const url = explorerTxUrl(movement.chainId ?? undefined, movement.txHash)

  if (url === null) {
    return (
      <span
        className={clsx('font-mono', MUTED_CLASS)}
        title={`${movement.txHash} — no public explorer is known for this chain.`}
      >
        {short}
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('font-mono', LINK_CLASS)}
      title={movement.txHash}
    >
      {short}
    </a>
  )
}

function StatusCell({ movement }: Readonly<{ movement: Movement }>) {
  // Indexation is the only state this source attests. It is a real one — the
  // movement is in the ledger because the indexer wrote it there.
  return (
    <>
      <span className="text-zinc-700 dark:text-zinc-300">Indexed</span>
      {movement.indexedAt === null ? null : (
        <span className={clsx('mt-0.5 block text-xs tabular-nums', MUTED_CLASS)} title={formatDateTime(movement.indexedAt)}>
          {formatRelativeTime(movement.indexedAt)}
        </span>
      )}
    </>
  )
}

/* ── Table shell ──────────────────────────────────────────────────────────── */

const HEADERS: readonly { key: string; label: string; className?: string }[] = [
  { key: 'time', label: 'Heure', className: 'whitespace-normal break-words' },
  { key: 'vault', label: 'Coffre' },
  { key: 'type', label: 'Type' },
  { key: 'client', label: 'Client' },
  { key: 'amount', label: 'Montant', className: 'text-right' },
  { key: 'transaction', label: 'Transaction' },
  { key: 'status', label: 'État', className: 'whitespace-normal break-words' },
]

const CELL = 'px-4 py-2 align-top'

function Heading({ movements }: Readonly<{ movements: Availability<readonly Movement[]> }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 className={gcc.cardTitle}>Movement ledger</h3>
      <Missing availability={movements} showRoute={false} />
    </div>
  )
}

/* ── The surface ──────────────────────────────────────────────────────────── */

export function MovementLedger({
  movements,
  vaults,
  limit,
}: Readonly<{
  movements: Availability<readonly Movement[]>
  vaults: Availability<readonly Vault[]>
  limit?: number
}>) {
  if (!isAvailable(movements)) {
    return (
      <Panel className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <Heading movements={movements} />
        </div>
        <div className={gcc.heroBody}>
          <Link href={DATA_COVERAGE_HREF} className={LINK_CLASS}>
            Data coverage
          </Link>
        </div>
      </Panel>
    )
  }

  const all = movements.value
  if (all.length === 0) {
    return (
      <Panel className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <Heading movements={movements} />
        </div>
        <div className={gcc.heroBody}>
          <p className={gcc.cellText}>No indexed movement yet.</p>
        </div>
      </Panel>
    )
  }

  // A vault is joined by identifier, never by label: two vaults can share a
  // display name, and a wrong join would attribute a movement to the wrong
  // contract.
  const vaultsById = new Map<VaultId, Vault>()
  if (isAvailable(vaults)) {
    for (const v of vaults.value) vaultsById.set(v.id, v)
  }

  const cap = typeof limit === 'number' && limit > 0 ? limit : all.length
  const shown = all.slice(0, cap)
  const truncated = shown.length < all.length

  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroHead}>
        <Heading movements={movements} />
      </div>

      <div className={clsx(gcc.heroBody, 'overflow-x-auto')}>
        <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <caption className="sr-only">Movement ledger: chronological on-chain events for the estate.</caption>
          <thead>
            <tr className={clsx('border-b border-zinc-950/10 text-xs dark:border-console-line', MUTED_CLASS)}>
              {HEADERS.map((h) => (
                <th key={h.key} scope="col" className={clsx(h.className, 'px-4 py-2 font-medium')}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
            {shown.map((m) => {
              const vault = m.vaultId === null ? undefined : vaultsById.get(m.vaultId)
              return (
                <tr
                  key={m.id}
                  id={`movement-${m.id}`}
                  className="scroll-mt-24 hover:bg-white/3 target:bg-accent-500/10"
                >
                  <td className={clsx(CELL, 'whitespace-normal wrap-break-word')}>
                    <TimeCell movement={m} />
                  </td>
                  <td className={CELL}>
                    <VaultCell movement={m} vault={vault} />
                  </td>
                  <td className={CELL}>
                    <span className="text-zinc-950 dark:text-white" title={phraseMouvement(m.eventName)}>
                      {libelleMouvement(m.eventName)}
                    </span>
                  </td>
                  <td className={CELL}>
                    <ClientCell movement={m} />
                  </td>
                  <td className={clsx(CELL, 'text-right whitespace-normal wrap-break-word')}>
                    <AmountCell movement={m} vault={vault} />
                  </td>
                  <td className={CELL}>
                    <TransactionCell movement={m} />
                  </td>
                  <td className={clsx(CELL, 'whitespace-normal wrap-break-word')}>
                    <StatusCell movement={m} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className={clsx(gcc.cellText, 'px-4 py-2')}>
        {truncated
          ? `${formatNumber(shown.length)} / ${formatNumber(all.length)} shown.`
          : `${formatNumber(all.length)} shown.`}{' '}
        Indexed only.
      </p>
    </Panel>
  )
}
