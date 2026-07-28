import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability, type Provenance, type Unavailable } from '@/lib/vaults/model'
import clsx from 'clsx'

/**
 * The component that makes "unavailable" impossible to mistake for "zero".
 *
 * Everywhere else in this console a figure is either a reading or an absence,
 * and the two are opposite facts. A dash could be either. A zero is worse: it
 * is a number, so the reader treats it as a measurement. This badge is the one
 * place that renders the second case, and it renders it with a WORD —
 * "Unavailable" — plus the reason the service itself gave and the route that
 * would answer it.
 *
 * ── Where colour is spent ────────────────────────────────────────────────
 * An absence is NOT an incident. `GET /api/v1/clients` answers 404 because the
 * endpoint does not exist yet, not because anything failed, and painting that
 * red would teach the reader to ignore red. So every absence renders neutral
 * graphite, whatever its status.
 *
 * The one exception is `stale`: the service declaring its own reading out of
 * date IS a state claim, made by the source, about data that is on screen. It
 * gets the warning tone and the word "stale" next to it.
 *
 * ── What this badge deliberately does NOT do ─────────────────────────────
 * It carries no link. It appears many times per page — in table cells, beside
 * metrics, in card headers — and a link on each would turn every absence into
 * a call to action. The page decides whether to offer the single "Data
 * coverage" link that explains the whole picture.
 */

/* ── Provenance ───────────────────────────────────────────────────────────── */

/**
 * How the service describes where a reading came from. Both forms are written
 * out rather than abbreviated at the call site, so a dense table and a card
 * header say the same thing at two lengths instead of two different things.
 */
const PROVENANCE_LABEL: Record<Provenance, { short: string; long: string }> = {
  live: { short: 'Live', long: 'Live source' },
  db: { short: 'Database', long: 'Database' },
  manual: { short: 'Manual', long: 'Manual entry' },
  chain: { short: 'On-chain', long: 'On-chain read' },
  unknown: { short: 'Source not stated', long: 'Source not stated by the service' },
}

/* ── Reasons ──────────────────────────────────────────────────────────────── */

/**
 * The machine reasons this backend actually returns, in English.
 *
 * Only reasons that have been observed are translated. Anything else is
 * rendered VERBATIM, in mono, exactly as the service worded it — inventing a
 * friendly sentence for a code we have never seen would be putting words in
 * the service's mouth, which is the same defect as inventing a number.
 */
const REASON_TEXT: Record<string, string> = {
  field_absent_from_response: 'The response carried no such field.',
  ledger_carries_no_pocket: 'The ledger records no pocket for this movement.',
  no_client_directory_endpoint: 'The service exposes no client directory.',
  no_contract_address_reported: 'The service reported no contract address.',
  no_creation_timestamp: 'The contract publishes no creation timestamp.',
  no_deployment_ledger_endpoint: 'The service exposes no deployment ledger.',
  no_investor_record: 'This account is attached to no investor record.',
  no_pocket_share_readable: 'No pocket share could be read.',
  no_readable_pocket_drift: 'No pocket drift could be read.',
  no_share_to_cross_check_against: 'No share was reported to cross-check the amount against.',
  no_snapshot_timestamp: 'The snapshot carried no timestamp.',
  no_vault_allocation_readable: 'No vault allocation could be read.',
  not_exposed_by_contract: 'The contract does not expose it.',
  pocket_assets_contradicts_reported_share: 'The reported amount contradicts the pocket’s own share.',
  pocket_assets_not_comparable: 'The reported amount could not be compared with the pocket’s share.',
  pocket_assets_not_reported: 'The service reported no amount for this pocket.',
  service_did_not_respond: 'The service did not respond.',
  some_pocket_shares_unreadable: 'Some pocket shares could not be read.',
}

type Reason = Readonly<{ text: string; verbatim: boolean }>

function readReason(raw: string | null): Reason | null {
  if (raw === null || raw === '') return null
  const known = REASON_TEXT[raw]
  if (known !== undefined) return { text: known, verbatim: false }
  return { text: raw, verbatim: true }
}

/* ── Badge ────────────────────────────────────────────────────────────────── */

const CHIP =
  'inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

/**
 * A filled dot marks a reading; a hollow ring marks an absence.
 *
 * The shape carries the distinction as well as the word does, so the two
 * states stay apart for a reader who cannot separate the greys.
 */
function Dot({ filled, className }: Readonly<{ filled: boolean; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'size-1.5 shrink-0 rounded-full',
        filled ? 'bg-current' : 'ring-1 ring-current',
        className,
      )}
    />
  )
}

/* ── Availability resolution ───────────────────────────────────────────────── */

type AvailabilityState = 'available' | 'stale' | 'unavailable'

function resolveAvailabilityState<T>(availability: Availability<T>): AvailabilityState {
  if (!isAvailable(availability)) return 'unavailable'
  return availability.stale ? 'stale' : 'available'
}

function resolveAvailabilityLabel<T>(availability: Availability<T>, compact: boolean): string {
  if (!isAvailable(availability)) return 'Unavailable'
  return compact ? PROVENANCE_LABEL[availability.provenance].short : PROVENANCE_LABEL[availability.provenance].long
}

function resolveAvailabilityDetail<T>(availability: Availability<T>, compact: boolean): string | null {
  if (!isAvailable(availability)) {
    if (compact) return availability.endpoint ?? readReason(availability.reason)?.text ?? null
    return null
  }

  const freshness = availability.asOf === null ? null : formatRelativeTime(availability.asOf)
  if (compact) {
    return [freshness, availability.stale ? 'stale' : null]
      .filter((part): part is string => part !== null)
      .join(' · ')
  }

  if (freshness === null) return availability.stale ? 'stale' : null
  return [`as of ${freshness}`, availability.stale ? 'stale' : null]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

function resolveAvailabilityTitle<T>(availability: Availability<T>): string | undefined {
  if (!isAvailable(availability)) {
    const reason = readReason(availability.reason)
    return ['Unavailable', reason === null ? null : reason.text, availability.endpoint]
      .filter((part): part is string => part !== null)
      .join(' · ')
  }

  const exact = availability.asOf === null ? null : formatDateTime(availability.asOf)
  return [PROVENANCE_LABEL[availability.provenance].long, exact === null ? null : `as of ${exact}`, availability.stale ? 'stale' : null]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

function resolveAvailabilityVariant(state: AvailabilityState): {
  chip: string
  dot: string | undefined
} {
  if (state === 'stale') {
    return {
      chip: 'bg-warning-500/10 text-warning-600 ring-warning-500/30 dark:text-warning-400',
      dot: undefined,
    }
  }
  if (state === 'available') {
    return {
      chip: 'bg-white/5 text-zinc-600 ring-zinc-950/10 dark:text-zinc-300 dark:ring-console-line-strong',
      dot: 'text-accent-600 dark:text-accent-400',
    }
  }
  return {
    chip: 'bg-white/5 text-zinc-600 ring-zinc-950/10 dark:text-zinc-300 dark:ring-console-line-strong',
    dot: undefined,
  }
}

function resolveAvailabilityLink(availability: Availability<unknown>): string | null {
  return availability.kind === 'unavailable' ? availability.endpoint : null
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

function AvailableBadge({
  availability,
  compact,
}: Readonly<{ availability: Availability<unknown>; compact: boolean }>) {
  const state = resolveAvailabilityState(availability)
  const label = resolveAvailabilityLabel(availability, compact)
  const detail = resolveAvailabilityDetail(availability, compact)
  const title = resolveAvailabilityTitle(availability)
  const { chip, dot } = resolveAvailabilityVariant(state)

  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-xs',
          state === 'stale' ? 'text-warning-600 dark:text-warning-400' : 'text-zinc-500 dark:text-zinc-400',
        )}
        title={title}
      >
        <Dot filled className={dot} />
        <span className="truncate">
          {[label, detail].filter((part): part is string => part !== null && part !== '').join(' · ')}
        </span>
      </span>
    )
  }

  return (
    <span className={clsx(CHIP, chip)} title={title}>
      <Dot filled className={dot} />
      <span className="truncate">
        {[label, detail].filter((part): part is string => part !== null && part !== '').join(' · ')}
      </span>
    </span>
  )
}

function UnavailableBadge({
  availability,
  compact,
}: Readonly<{ availability: Unavailable; compact: boolean }>) {
  const title = resolveAvailabilityTitle(availability)
  const detail = resolveAvailabilityDetail(availability, compact)
  const reason = readReason(availability.reason)
  const link = resolveAvailabilityLink(availability)

  if (compact) {
    return (
      <span
        className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400"
        title={title}
      >
        <Dot filled={false} />
        <span className="shrink-0 font-medium text-zinc-600 dark:text-zinc-300">Unavailable</span>
        {detail === null ? null : (
          <span className={clsx('truncate', link !== null && 'font-mono text-[0.6875rem]')}>{detail}</span>
        )}
      </span>
    )
  }

  return (
    <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-1" title={title}>
      <span
        className={clsx(
          CHIP,
          'bg-white/5 text-zinc-600 ring-zinc-950/10 dark:text-zinc-300 dark:ring-console-line-strong',
        )}
      >
        <Dot filled={false} />
        Unavailable
      </span>
      {reason === null ? null : (
        <span
          className={clsx(
            'max-w-prose text-xs/5 text-zinc-500 dark:text-zinc-400',
            reason.verbatim && 'font-mono break-all',
          )}
        >
          {reason.text}
        </span>
      )}
      {link === null ? null : (
        <span className="max-w-full truncate font-mono text-[0.6875rem]/4 text-zinc-500 dark:text-zinc-500">
          {link}
        </span>
      )}
    </span>
  )
}

export function SourceAvailabilityBadge({
  availability,
  compact,
}: Readonly<{ availability: Availability<unknown>; compact?: boolean }>) {
  const isCompact = compact === true

  if (isAvailable(availability)) {
    return <AvailableBadge availability={availability} compact={isCompact} />
  }

  return <UnavailableBadge availability={availability} compact={isCompact} />
}
