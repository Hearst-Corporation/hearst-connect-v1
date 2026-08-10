import { csl, Reading } from '@/components/layout/console'
import type { Availability } from '@/lib/vaults/model'
import { Panel } from '@/components/compositions/panel'
import { RichSparkline } from '@/components/charts'
import clsx from 'clsx'

/**
 * The figures: the headline value, the side fact, and the KPI card.
 *
 * ── What these three components replace ────────────────────────────────────
 * `HeroFigure` was redeclared across 6 routes and `SideFact` across 4, with the
 * same body up to formatting. `ClientsMetric` (clients) and `ComplianceMetric`
 * (compliance) were identical except for their names.
 *
 * ── Why two entries and not one ────────────────────────────────────────────
 * `MetricValue` takes an ALREADY-formatted string: several routes compute a
 * value that is not an `Availability` (an editorial label, a derived count).
 * `MetricCard` takes an `Availability` and delegates to `Reading`, which is the
 * only path by which an absence becomes a named state rather than a zero.
 * Merging the two would force accepting a "—" string as if it were a
 * measurement, which the veracity doctrine forbids.
 */

/**
 * A headline figure: the value, then what it measures.
 *
 * `unit` is optional — `series-1` declared its own copy without it, which was
 * the only difference between the six local variants.
 */
export function MetricValue({
  value,
  label,
  unit,
}: Readonly<{ value: string; label: string; unit?: string }>) {
  return (
    <div>
      <p className={csl.metricValue}>{value}</p>
      <p className={csl.cellText}>
        {label}
        {unit === undefined || unit === '' ? '' : ` · ${unit}`}
      </p>
    </div>
  )
}

/** A side fact: the label on top, the value below. */
export function SideFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className={csl.cellText}>{label}</p>
      <p className={csl.cellStrong}>{value}</p>
    </div>
  )
}

/**
 * A KPI card backed by an `Availability`.
 *
 * The title is an `h2` by default: these cards are the first landmarks of a
 * page under the shell's `h1`. The caller can lower the level when the card
 * lives inside a section that already carries its title — the document outline
 * stays readable to a screen reader.
 *
 * The value passes through `Reading`: if the `Availability` is unavailable, a
 * named state is displayed, never a zero nor a mute dash.
 */
export function MetricCard({
  title,
  value,
  trend,
  as: Tag = 'h2',
  showRoute = false,
  className,
}: Readonly<{
  title: string
  value: Availability<string>
  trend?: number[]
  as?: 'h2' | 'h3'
  /** Displays the backend route that would answer, when the value is absent. */
  showRoute?: boolean
  className?: string
}>) {
  return (
    <Panel tone="metric" className={clsx('flex flex-col gap-3', className)}>
      <Tag>{title}</Tag>
      <div className={csl.metricText}>
        <Reading value={value} className={csl.metricValue} showRoute={showRoute} />
      </div>
      {trend && trend.length >= 2 && (
        <div className="mt-auto pt-2">
          <RichSparkline data={trend} height={24} />
        </div>
      )}
    </Panel>
  )
}

/**
 * The KPI row — the container for `MetricCard`s.
 *
 * `aria-label` is MANDATORY: a row of numbers without a name says nothing to
 * someone navigating by regions. The routes that composed this row by hand
 * forgot it every other time.
 */
export function KpiRow({
  children,
  label,
  className,
}: Readonly<{ children: React.ReactNode; label: string; className?: string }>) {
  return (
    <section className={clsx(csl.metricsRow, className)} aria-label={label}>
      {children}
    </section>
  )
}
