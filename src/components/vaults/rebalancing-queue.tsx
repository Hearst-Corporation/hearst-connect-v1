import clsx from 'clsx'
import { Panel } from '@/components/compositions'
import Link from 'next/link'

import { Absent, gcc } from '@/components/layout/console'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { REBALANCING_THRESHOLD_BPS, isAvailable, type Availability, type RebalancingRow } from '@/lib/vaults/model'

/**
 * The rebalancing queue — every strategy pocket measured against its target.
 *
 * ── Why the whole allocation is listed, not only the breaches ─────────────
 * A queue that showed only breached pockets would be unreadable as evidence:
 * an admin looking at an empty screen cannot tell "nothing is off target"
 * apart from "nothing was measured". Listing every pocket makes the claim
 * checkable, and the tone encoding carries the judgement: neutral inside
 * tolerance, warning only above it, the word "Unavailable" when the drift was
 * not readable at all.
 *
 * ── Why the threshold is stated on screen ─────────────────────────────────
 * `REBALANCING_THRESHOLD_BPS` is a CONVENTION OF THIS CONSOLE. The contract
 * publishes no tolerance — `/api/v1/rebalancing/status` answers UNAVAILABLE
 * with the reason `not_exposed_by_contract`. Rendering a red row without
 * saying whose rule it breaks would pass our own convention off as the
 * product's, so the header says it once, plainly.
 */

/** The console's tolerance, expressed the way the table reads it: in points. */
const THRESHOLD_POINTS = formatNumber(REBALANCING_THRESHOLD_BPS / 100, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * `entityHref` is the single place routes are built, so the ledger link is
 * derived from it rather than typed out here. A rebalancing row is a pocket,
 * not a movement, so there is no movement identifier to anchor on — inventing
 * one would be a fabricated reference. Dropping the fragment leaves the ledger
 * route itself, which is exactly where "movement history" should land.
 */
const LEDGER_HREF = entityHref('movement', '').split('#')[0]

/** The one technical explanation this surface links to. */
const COVERAGE_HREF = entityHref('source', 'rebalancing-status')

const ROW_LINK =
  'text-xs font-medium text-accent-400 underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500'

type RebalancingColumn = Readonly<{
  key: string
  header: string
  className?: string
  cell: (row: RebalancingRow) => React.ReactNode
}>

/**
 * An absence, in the one word the console uses for it. Never "—", never "0":
 * a drift that could not be read and a drift of zero are opposite facts.
 */
function Unreadable({ note }: Readonly<{ note: string }>) {
  return (
    <span className="text-zinc-500 dark:text-zinc-400" title={note}>
      Indisponible
    </span>
  )
}

/**
 * A drift is a DIFFERENCE between two shares, so it reads in signed POINTS —
 * "+2.15 pt". Raw basis points would make a 2-point drift look like 215 of
 * something, and an unsigned percentage would hide which way the pocket moved.
 */
function driftPoints(bps: number | null): string | null {
  if (bps === null || !Number.isFinite(bps)) return null
  const points = formatNumber(bps / 100, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${points} pt`
}

/** The pocket key inside a strategy identifier (`"{vaultId}:{pocket}"`). */
function pocketOf(row: RebalancingRow): string | null {
  const at = row.strategyId.lastIndexOf(':')
  if (at < 0 || at === row.strategyId.length - 1) return null
  return row.strategyId.slice(at + 1)
}

/**
 * Breaches first, then pockets whose drift could not be read, then the ones
 * known to be in range. An unreadable pocket outranks a healthy one on
 * purpose: it is an unknown risk, not a cleared one.
 */
function severity(row: RebalancingRow): number {
  if (row.breached) return 0
  if (row.varianceBps === null) return 1
  return 2
}

function ordered(rows: readonly RebalancingRow[]): readonly RebalancingRow[] {
  return [...rows].sort((a, b) => {
    const bySeverity = severity(a) - severity(b)
    if (bySeverity !== 0) return bySeverity
    if (a.varianceBps !== null && b.varianceBps !== null) {
      const byMagnitude = Math.abs(b.varianceBps) - Math.abs(a.varianceBps)
      if (byMagnitude !== 0) return byMagnitude
    }
    return a.strategyId.localeCompare(b.strategyId)
  })
}

const COLUMNS: readonly RebalancingColumn[] = [
  {
    key: 'vault',
    header: 'Coffre',
    cell: (row) => <VaultEntityLink kind="vault" id={row.vaultId} label={row.vaultLabel} />,
  },
  {
    key: 'strategy',
    header: 'Stratégie',
    cell: (row) => {
      const pocket = pocketOf(row)
      return (
        <VaultEntityLink
          kind="strategy"
          id={row.strategyId}
          label={row.strategyLabel}
          sub={pocket !== null && pocket !== row.strategyLabel ? pocket : undefined}
        />
      )
    },
  },
  {
    key: 'target',
    header: 'Cible',
    className: 'text-right tabular-nums',
    cell: (row) => (
      <span className="text-zinc-950 dark:text-zinc-300">
        {formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'actual',
    header: 'Constaté',
    className: 'text-right tabular-nums',
    cell: (row) =>
      row.actualBps === null ? (
        <Unreadable note="The service reported no actual share for this pocket." />
      ) : (
        <span className="text-zinc-950 dark:text-zinc-300">
          {formatPercent(row.actualBps, { fromBps: true, maximumFractionDigits: 2 })}
        </span>
      ),
  },
  {
    key: 'variance',
    header: 'Écart',
    className: 'text-right tabular-nums',
    cell: (row) => {
      const drift = driftPoints(row.varianceBps)
      if (drift === null) {
        return <Unreadable note="Neither a drift nor an actual share was reported for this pocket." />
      }
      return (
        // The only place a semantic hue is spent: a real state claim against
        // the threshold stated in the header. A pocket inside tolerance stays
        // body-coloured so the table does not read as a wall of alarms.
        <span className={clsx(row.breached ? 'font-medium text-warning-400' : 'text-zinc-950 dark:text-zinc-300')}>
          {drift}
        </span>
      )
    },
  },
  {
    key: 'threshold',
    header: 'Seuil',
    className: 'text-right tabular-nums',
    cell: (row) => (
      <span className="text-zinc-500 dark:text-zinc-400">
        ±{formatNumber(row.thresholdBps / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pt
      </span>
    ),
  },
  {
    key: 'last-rebalance',
    header: 'Dernier rééquilibrage',
    cell: (row) => {
      // An available reading that carries an empty string is the contract
      // answering without a date — still an absence, not a blank cell.
      if (isAvailable(row.lastRebalanceAt) && row.lastRebalanceAt.value !== '') {
        return (
          <span className="text-zinc-950 tabular-nums dark:text-zinc-300">
            {formatDateTime(row.lastRebalanceAt.value)}
          </span>
        )
      }
      return <Absent availability={row.lastRebalanceAt} showRoute={false} />
    },
  },
  {
    key: 'action',
    header: 'Action',
    cell: (row) => {
      if (row.varianceBps === null) {
        return <Unreadable note="No drift reading, so no action can be recommended." />
      }
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {row.breached ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-400/15 px-2 py-0.5 text-xs font-medium text-warning-400 ring-1 ring-warning-400/30 ring-inset">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {' '}
              Above threshold
            </span>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Within tolerance</span>
          )}
          <Link href={entityHref('keeper', row.strategyId)} className={ROW_LINK}>
            {/* Labelled for what it is on this row: an in-range pocket gets a
                neutral destination, not an imperative it does not warrant. */}
            {row.breached ? 'Rebalance' : 'Keeper'}
          </Link>
          <Link href={LEDGER_HREF} className={ROW_LINK}>
            Movements
          </Link>
        </div>
      )
    },
  },
] as const

const HEAD_CELL = 'px-3 py-2 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-3 py-2 align-top'

export function RebalancingQueue({ rows }: Readonly<{ rows: Availability<readonly RebalancingRow[]> }>) {
  if (!isAvailable(rows)) {
    return (
      <Panel tone="plain" className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <h3 className={gcc.cardTitle}>Rebalancing</h3>
        </div>
        <div className={gcc.heroBody}>
          <Absent availability={rows} showRoute />
          <Link href={COVERAGE_HREF} className={ROW_LINK}>
            Data coverage
          </Link>
        </div>
      </Panel>
    )
  }

  const list = rows.value
  const readable = list.filter((row) => row.varianceBps !== null)
  const breached = list.filter((row) => row.breached)
  /** The positive claim below is only allowed if every pocket actually reported. */
  const everyPocketRead = list.length > 0 && readable.length === list.length

  if (list.length === 0) {
    return (
      <Panel tone="plain" className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <h3 className={gcc.cardTitle}>Rebalancing</h3>
        </div>
        <div className={gcc.heroBody}>
          <p className={gcc.cellText}>Aucune poche</p>
          <Link href={COVERAGE_HREF} className={ROW_LINK}>
            Data coverage
          </Link>
        </div>
      </Panel>
    )
  }

  let summary: string
  if (breached.length > 0) {
    summary = `${formatNumber(breached.length)} flagged`
  } else if (everyPocketRead) {
    summary = 'All within tolerance'
  } else {
    summary = `${formatNumber(list.length - readable.length)} unread`
  }

  return (
    <Panel tone="plain" className={gcc.wavePanel}>
      <div className={gcc.heroHead}>
        <div className="flex w-full items-center justify-between gap-3">
          <h3 className={gcc.cardTitle}>Rebalancing</h3>
          <span className={gcc.cellText}>±{THRESHOLD_POINTS} pt</span>
        </div>
      </div>
      <div className={clsx(gcc.heroBody, 'gap-3')}>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
            <p className="text-[0.6875rem]/4 uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Status</p>
            <p className={clsx('mt-1 text-sm font-medium', breached.length > 0 ? 'text-warning-400' : 'text-zinc-950 dark:text-white')}>
              {summary}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
            <p className="text-[0.6875rem]/4 uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Readable</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-zinc-950 dark:text-white">
              {formatNumber(readable.length)}/{formatNumber(list.length)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50/70 px-2.5 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
            <p className="text-[0.6875rem]/4 uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Seuil</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-zinc-950 dark:text-white">±{THRESHOLD_POINTS} pt</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <caption className="sr-only">Rebalancing queue: vault, strategy, target and actual share, variance and last rebalance.</caption>
            <thead>
              <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col" className={clsx(HEAD_CELL, column.className)}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              {ordered(list).map((row) => (
                <tr key={row.strategyId}>
                  {COLUMNS.map((column) => (
                    <td key={`${row.strategyId}-${column.key}`} className={clsx(BODY_CELL, column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  )
}
