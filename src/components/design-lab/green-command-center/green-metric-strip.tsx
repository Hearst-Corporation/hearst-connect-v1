import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Subheading } from '@/components/catalyst/heading'
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
  title: string
  value: Availability<string>
  glyph: string
  hollow?: boolean
}>

function MetricPanel({ cell }: Readonly<{ cell: MetricCell }>) {
  const available = isAvailable(cell.value)
  return (
    <Panel className={gcc.metricCard} data-gcc="metric-card">
      {/* `Subheading` du kit : 14px/24px, 600, blanc. Remplace un h2 maison à 12px. */}
      <Subheading level={2} className={gcc.cardTitle}>
        {cell.title}
      </Subheading>
      <div className={gcc.metricLine}>
        <span
          className={clsx(gcc.metricIcon, cell.hollow === true && gcc.metricIconHollow)}
          aria-hidden="true"
        >
          {cell.glyph}
        </span>
        <div className={gcc.metricText}>
          <div className={gcc.metricValueSlot}>
            <Reading value={cell.value} showRoute={false} />
          </div>
          <span className={available ? gcc.metricStateLive : gcc.metricStateUnavailable}>
            <span className={available ? gcc.signalDot : gcc.metricStateDotMuted} aria-hidden="true">
              ●
            </span>
            {available ? 'Live' : 'Unavailable'}
          </span>
        </div>
      </div>
    </Panel>
  )
}

/**
 * The decision panel — the accent block at the end of the band.
 *
 * In the reference it announces "03 ITEMS PENDING" as decoration. Here it
 * counts what actually needs a decision, and when that count has no source it
 * says so on the accent field rather than displaying a confident zero.
 */
export function GreenDecisionPanel({
  pending,
  hint,
  actionable,
}: Readonly<{ pending: Availability<string>; hint: string; actionable: boolean }>) {
  const unavailable = !isAvailable(pending)
  return (
    <Panel
      className={actionable ? gcc.decisionCardStrong : unavailable ? gcc.decisionCardCalm : gcc.decisionCardNeutral}
      aria-label="Decision queue"
      data-gcc="decision-card"
    >
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
      <div className={gcc.decisionMeta}>
        <span className={actionable ? gcc.decisionAction : gcc.decisionActionMuted}>
          <span aria-hidden="true">●</span> {hint}
        </span>
      </div>
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
