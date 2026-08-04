import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Subheading } from '@/components/catalyst/heading'
import { Strong } from '@/components/catalyst/text'
import { Absent, gcc, Panel } from '@/components/layout/console'
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
}>

function SignalPanel({ signal, compact }: Readonly<{ signal: Signal; compact: boolean }>) {
  return (
    <Panel className={clsx(gcc.signalCard, compact && gcc.signalCompact)} data-gcc="signal-card">
      <Subheading level={3} className={gcc.cardTitle}>
        {signal.title}
      </Subheading>
      {isAvailable(signal.value) ? (
        <Strong className={gcc.signalValue}>{signal.value.value}</Strong>
      ) : (
        /* The reference signal card is a 9px heading over two 8px lines. The
           absence keeps to one line so the five-row stack keeps its rhythm;
           the route is already stated on the metric band above. */
        <Absent availability={signal.value} showRoute={false} />
      )}
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
