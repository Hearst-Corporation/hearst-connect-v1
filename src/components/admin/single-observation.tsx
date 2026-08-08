import { AdminCaption, AdminLabel } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * One observation is not a trend, and must not be drawn as one.
 *
 * A single bar rendered into an 800px plot area reads as a chart with missing
 * data — the reader spends a second looking for the rest of the series before
 * concluding something is broken. Nothing is broken: the service has recorded
 * exactly one period so far.
 *
 * So a lone observation renders as what it is — a value, its period, and a
 * micro-bar that situates it without pretending to a scale — plus a sentence
 * saying in words that no trend is measurable yet. When a second, and
 * preferably a third, ordered observation arrives, the caller switches to a
 * real chart (`plottableAsChart` in `@/components/charts/core/chart-theme` is the test).
 *
 * The micro-bar is deliberately full-width-at-100%: with one point there is
 * no scale to compare against, so it encodes nothing but "a value exists".
 * `comparaison` exists for the case where a real reference (a target, a cap)
 * IS available — only then does the bar carry a proportion.
 */

export function SingleObservation({
  valeur,
  unite,
  periode,
  contexte,
  comparaison,
  note = 'Only one period has been recorded so far — no trend can be measured yet.',
  className,
}: Readonly<{
  /** The measurement, already formatted. */
  valeur: string
  unite?: string
  /** Which period the measurement covers ("July 2026"). */
  periode: string
  /** What the reader needs to interpret it. */
  contexte?: string
  /** A real reference to situate the value against, when one exists. */
  comparaison?: { readonly libelle: string; readonly part: number }
  note?: string
  className?: string
}>) {
  const part =
    comparaison === undefined ? null : Math.max(0, Math.min(100, comparaison.part))

  return (
    <div className={clsx(className, 'px-6 py-5')}>
      <AdminLabel>{periode}</AdminLabel>

      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl/10 font-semibold tracking-tight text-fg tabular-nums">
          {valeur}
        </span>
        {unite ? <span className="text-sm text-fg-tertiary dark:text-fg-secondary">{unite}</span> : null}
      </p>

      {contexte ? <AdminCaption className="mt-1.5">{contexte}</AdminCaption> : null}

      {/* Compact marker. One observation gets one mark — never a plot area. */}
      <div className="mt-4 max-w-xs" aria-hidden="true">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
          <div
            className="h-full rounded-full bg-accent-400"
            style={{ width: part === null ? '100%' : `${part}%` }}
          />
        </div>
        {comparaison ? (
          <p className="mt-1.5 text-xs text-fg-tertiary tabular-nums dark:text-fg-secondary">
            {comparaison.libelle}
          </p>
        ) : null}
      </div>

      <p className="mt-4 border-t border-ink/5 pt-3 text-xs leading-relaxed text-fg-tertiary dark:border-console-line dark:text-fg-secondary">
        {note}
      </p>
    </div>
  )
}
