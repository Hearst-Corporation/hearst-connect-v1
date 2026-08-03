import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Subheading } from '@/components/catalyst/heading'
import { Absent, gcc, Panel } from './primitives'
import clsx from 'clsx'

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
            <span className={gcc.metricValue}>{available ? cell.value.value : '—'}</span>
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

export function GreenDecisionPanel({
  pending,
  hint,
  actionable,
}: Readonly<{ pending: Availability<string>; hint: string; actionable: boolean }>) {
  const unavailable = !isAvailable(pending)
  const useStrongGreen = actionable || unavailable

  return (
    <Panel
      className={useStrongGreen ? gcc.decisionCardStrong : gcc.decisionCardNeutral}
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
