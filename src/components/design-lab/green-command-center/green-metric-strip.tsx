import { isAvailable, signalOf, type Availability, type Signal } from '@/lib/vaults/model'
import { Subheading } from '@/components/catalyst/heading'
import { Absent, gcc, Panel } from './primitives'
import clsx from 'clsx'

/**
 * VER-09: the freshness badge is driven by the value's SIGNAL — its provenance
 * and staleness — not by mere presence. "Live" is reserved for a fresh backend
 * reading; an editorial value reads "Reference", a stale one reads "Stale".
 */
const SIGNAL_LABEL: Record<Signal, string> = {
  live: 'Live',
  stale: 'Stale',
  editorial: 'Reference',
  absent: 'Unavailable',
}

function signalClasses(signal: Signal): { text: string; dot: string; hollow: boolean } {
  switch (signal) {
    case 'live':
      return { text: gcc.metricStateLive, dot: gcc.signalDot, hollow: false }
    case 'stale':
      return { text: gcc.metricStateStale, dot: gcc.metricStateDotStale, hollow: false }
    case 'editorial':
      return { text: gcc.metricStateEditorial, dot: gcc.metricStateDotEditorial, hollow: true }
    case 'absent':
      return { text: gcc.metricStateUnavailable, dot: gcc.metricStateDotMuted, hollow: false }
  }
}

export type MetricCell = Readonly<{
  id: string
  title: string
  value: Availability<string>
  glyph: string
  hollow?: boolean
}>

function MetricPanel({ cell }: Readonly<{ cell: MetricCell }>) {
  const available = isAvailable(cell.value)
  const signal = signalOf(cell.value)
  const state = signalClasses(signal)

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
          <span className={state.text}>
            <span className={state.dot} aria-hidden="true">
              {state.hollow ? '○' : '●'}
            </span>
            {SIGNAL_LABEL[signal]}
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
