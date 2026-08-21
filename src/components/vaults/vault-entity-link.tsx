import clsx from 'clsx'
import Link from 'next/link'

/**
 * The one place a cross-entity route is written down.
 *
 * A console whose surfaces each build their own `/admin/vaults/${id}` template
 * string drifts the moment one route is renamed: half the links keep working,
 * the other half 404, and nothing fails loudly enough to notice. Every surface
 * imports `entityHref` instead, so a route change is one edit here.
 *
 * Entities are addressed by IDENTIFIER, never by display label. Two strategies
 * both labelled "Strategy 0" on different vaults are different objects, and a
 * link built from the label would send the reader to whichever one happened to
 * come first.
 */

export type EntityKind = 'vault' | 'strategy' | 'client' | 'keeper' | 'source' | 'compliance'

/**
 * A vault id is `{chainId}-{address}` and a strategy id is `{vaultId}:{pocket}`
 * — the vault half is colon-free by construction, so the FIRST colon is the
 * separator.
 */
function splitStrategyId(id: string): { vault: string; pocket: string } | null {
  const at = id.indexOf(':')
  if (at <= 0 || at === id.length - 1) return null
  return { vault: id.slice(0, at), pocket: id.slice(at + 1) }
}

export function entityHref(kind: EntityKind, id: string): string {
  switch (kind) {
    case 'vault':
      // `encodeURIComponent` is a no-op on a well-formed vault id (digits, a
      // hyphen and a hex address) and a safety net on a malformed one.
      return `/admin/vaults/${encodeURIComponent(id)}`

    case 'strategy': {
      const parts = splitStrategyId(id)
      // A strategy has no page of its own: it is an anchor on its vault. An id
      // that carries no pocket is still a vault reference, so the reader lands
      // on the vault rather than on a broken route.
      if (parts === null) return `/admin/vaults/${encodeURIComponent(id)}`
      // The fragment is left unencoded on purpose: it has to match the DOM id
      // the vault page renders, character for character.
      return `/admin/vaults/${encodeURIComponent(parts.vault)}#strategy-${parts.pocket}`
    }

    // The remaining kinds have no per-entity route today, because the service
    // exposes no directory to build one from. They resolve to the screen that
    // covers the subject rather than to a route that would 404.
    case 'client':
      return '/admin/clients'
    case 'compliance':
      return '/admin/compliance'
    case 'keeper':
      return '/admin/keeper'
    case 'source':
      // Data coverage: a section inside `/admin/runtime` (not the
      // subscription management on `/admin`).
      return '/admin/runtime'
  }
}

/**
 * A reference to another entity: its label, optionally a second line that
 * situates it (an address, a pocket, a block), and nothing else.
 *
 * Both lines truncate rather than wrap. A contract address or a transaction
 * hash is long enough to blow a table column open, and a row that grows to
 * three lines to fit one hash is a worse read than a truncated hash.
 */
export function VaultEntityLink({
  kind,
  id,
  label,
  sub,
  className,
}: Readonly<{
  kind: EntityKind
  id: string
  label: string
  sub?: string
  className?: string
}>) {
  return (
    <Link
      href={entityHref(kind, id)}
      title={sub === undefined ? label : `${label} · ${sub}`}
      className={clsx(
        className,
        'group block min-w-0 max-w-full rounded-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500',
      )}
    >
      <span className="block truncate text-sm font-medium text-ink group-hover:text-accent-700 dark:text-white dark:group-hover:text-accent-400">
        {label}
      </span>
      {sub === undefined ? null : (
        <span className="block truncate text-xs text-fg-tertiary dark:text-fg-secondary">{sub}</span>
      )}
    </Link>
  )
}
