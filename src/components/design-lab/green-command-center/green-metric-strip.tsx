import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Absent, gcc, Panel, Reading } from './primitives'
import clsx from 'clsx'

/**
 * The top metric band: five figures, then the decision panel.
 *
 * ── What is ported and what is replaced ───────────────────────────────────
 * Ported: the 116px band height, the five-flexible-plus-290px column ruler,
 * the 30px accent medallion (filled, and the hollow ringed variant), the 12px
 * bold heading, the 7px caption pair, the zero-gap card seam with its
 * `#050506` right border.
 *
 * Replaced: every number and label. The prototype reads "BTC Production /
 * 1,089" — this console has no BTC production figure, and inventing one is
 * exactly what the product forbids. Each cell now carries a real overview
 * reading, or the named absence that reading has today.
 */

export type MetricCell = Readonly<{
  id: string
  /** Panel heading — the operational name of the figure. */
  title: string
  value: Availability<string>
  /** What the figure measures. */
  caption: string
  /** Where it is read from, in the reference's second caption line. */
  support: string
  glyph: string
  /** Hollow ringed medallion, as the reference's ring/gauge/orbit variants. */
  hollow?: boolean
}>

function MetricPanel({ cell }: Readonly<{ cell: MetricCell }>) {
  return (
    <Panel className={gcc.metricCard} data-gcc="metric-card">
      <h2>{cell.title}</h2>
      <div className={gcc.metricLine}>
        <span
          className={clsx(gcc.metricIcon, cell.hollow === true && gcc.metricIconHollow)}
          aria-hidden="true"
        >
          {cell.glyph}
        </span>
        {/*
         * The reference cell is exactly three lines tall: a figure and two 7px
         * captions. An absence has to fit that same box, so it occupies the
         * figure line as the word alone and the route takes the second caption
         * — never both a badge and a route on the figure line, which would push
         * the card past the 116px band.
         */}
        <div className={gcc.metricText}>
          <Reading value={cell.value} showRoute={false} />
          <small className={gcc.metricCaption}>{cell.caption}</small>
          <small className={gcc.metricCaption}>
            {isAvailable(cell.value) ? cell.support : (cell.value.endpoint ?? cell.value.reason ?? cell.support)}
          </small>
        </div>
      </div>
    </Panel>
  )
}

/**
 * The decision panel — the mint block at the end of the band.
 *
 * In the reference it announces "03 ITEMS PENDING" as decoration. Here it
 * counts what actually needs a decision, and when that count has no source it
 * says so on the accent field rather than displaying a confident zero.
 */
export function GreenDecisionPanel({
  pending,
  hint,
}: Readonly<{ pending: Availability<string>; hint: string }>) {
  return (
    <Panel className={gcc.decisionCard} aria-label="Decision queue" data-gcc="decision-card">
      <div className={gcc.decisionTitle}>
        DECISION <span>QUEUE</span>
      </div>
      <div className={gcc.decisionMeta}>
        {isAvailable(pending) ? (
          <>
            <b>{pending.value}</b> ITEMS PENDING
          </>
        ) : (
          /* The route is omitted on the accent field: the reference block is
             290px wide and a full endpoint-plus-reason string overflows it.
             The absence itself is still stated, which is the contract. */
          <Absent availability={pending} onAccent showRoute={false} />
        )}
      </div>
      <div className={gcc.decisionMeta}>● {hint}</div>
    </Panel>
  )
}

export function GreenMetricStrip({
  cells,
  decision,
}: Readonly<{ cells: readonly MetricCell[]; decision: React.ReactNode }>) {
  return (
    <section className={gcc.metricsRow} aria-label="Estate summary metrics" data-gcc="metrics-row">
      {cells.map((cell) => (
        <MetricPanel key={cell.id} cell={cell} />
      ))}
      {decision}
    </section>
  )
}
