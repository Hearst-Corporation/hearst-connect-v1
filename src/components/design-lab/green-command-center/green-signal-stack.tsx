import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Absent, gcc, Panel } from './primitives'
import clsx from 'clsx'

/**
 * The right column — five stacked signal panels.
 *
 * The reference stack is 118px + four equal rows, each a 9px heading over 8px
 * lines with a small grey sparkline. That geometry is kept exactly. What
 * changes is what the panels say: the prototype's "Change Of Multiple",
 * "#167% / 800", "Miner Gravity / #R1021" are invented labels over invented
 * numbers. These five carry the capital and source readings `/admin` shows in
 * its Capital card and its source strip.
 *
 * The sparkline is drawn only when a signal has a ratio to draw. It is a
 * GAUGE, not a time series — the reference's decorative bell curve would imply
 * history the panel does not have, so it is replaced by a fill proportional to
 * the real ratio, and omitted entirely when there is none.
 */

export type Signal = Readonly<{
  id: string
  title: string
  value: Availability<string>
  /** A short line naming what the figure is. */
  note?: string
  /** 0–10000 when the signal has a ratio worth drawing as a gauge. */
  gaugeBps?: Availability<number>
}>

function Gauge({ ratioBps }: Readonly<{ ratioBps: Availability<number> }>) {
  if (!isAvailable(ratioBps)) return null
  const clamped = Math.max(0, Math.min(10000, ratioBps.value))
  const filled = (clamped / 10000) * 220
  return (
    <svg viewBox="0 0 260 38" preserveAspectRatio="none" role="img" aria-label={`${(clamped / 100).toFixed(1)} percent`}>
      <rect x="20" y="22" width="220" height="5" fill="#2a2c33" />
      <rect x="20" y="22" width={filled.toFixed(1)} height="5" fill="#7cff00" />
    </svg>
  )
}

function SignalPanel({ signal, compact }: Readonly<{ signal: Signal; compact: boolean }>) {
  return (
    <Panel className={clsx(gcc.signalCard, compact && gcc.signalCompact)} data-gcc="signal-card">
      <h3>{signal.title}</h3>
      {signal.note !== undefined && (
        <p>
          <span className={gcc.signalDot}>●</span> {signal.note}
        </p>
      )}
      {isAvailable(signal.value) ? (
        <strong>{signal.value.value}</strong>
      ) : (
        /* The reference signal card is a 9px heading over two 8px lines. The
           absence keeps to one line so the five-row stack keeps its rhythm;
           the route is already stated on the metric band above. */
        <Absent availability={signal.value} showRoute={false} />
      )}
      {signal.gaugeBps !== undefined && <Gauge ratioBps={signal.gaugeBps} />}
    </Panel>
  )
}

export function GreenSignalStack({ signals }: Readonly<{ signals: readonly Signal[] }>) {
  return (
    <aside className={gcc.rightStack} aria-label="Capital and source signals" data-gcc="right-stack">
      {signals.map((signal, index) => (
        <SignalPanel key={signal.id} signal={signal} compact={index > 0} />
      ))}
    </aside>
  )
}
