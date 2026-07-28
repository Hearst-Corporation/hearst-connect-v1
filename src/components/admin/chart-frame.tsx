import { AdminLabel } from '@/components/admin/typography'
import { RequirementList } from '@/components/admin/surface'
import clsx from 'clsx'
import { Card, CardHeader } from './cockpit'

/**
 * Common frame for every chart in the product.
 *
 * A chart is not an image — it's a claim about data. This frame requires,
 * for every chart, what makes the claim verifiable: the question asked in
 * the title, the unit, the provenance, and the state of the data at render
 * time.
 *
 * An unavailable chart shows its title, its source state, and a concise
 * message — never a fake set of axes pretending data exists, and never a
 * viewport-tall box to say that nothing exists. The empty state is sized to
 * its sentence (`hauteur` in px), not to a global chart height.
 */

export type EtatSerie =
  | { readonly type: 'tracee' }
  | { readonly type: 'vide'; readonly explication: string }
  | { readonly type: 'attendue'; readonly explication: string }
  | { readonly type: 'indisponible'; readonly explication: string }

const TON_ETAT: Record<Exclude<EtatSerie['type'], 'tracee'>, string> = {
  vide: 'text-zinc-500 dark:text-zinc-400',
  attendue: 'text-zinc-500 dark:text-zinc-400',
  indisponible: 'text-danger-400',
}

const LIBELLE_ETAT: Record<Exclude<EtatSerie['type'], 'tracee'>, string> = {
  vide: 'No data for this period',
  attendue: 'Waiting on the source',
  indisponible: 'Data unavailable',
}

export function ChartFrame({
  question,
  unite,
  etat,
  hauteur,
  expectedSource,
  onRetry,
  retryLabel = 'Retry',
  children,
}: Readonly<{
  question: string
  unite: string
  etat: EtatSerie
  /**
   * Minimum height of the EMPTY state, in px. A plotted chart sizes itself
   * from its own data (see `chartHeight`), so this never applies to it.
   * Default: enough for the sentence, and not one pixel more.
   */
  hauteur?: number
  expectedSource?: readonly string[]
  onRetry?: () => void
  retryLabel?: string
  children?: React.ReactNode
}>) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title={question} hint={unite} />

      {etat.type === 'tracee' ? (
        children
      ) : (
        <div
          className={clsx('flex flex-col items-start gap-2 px-5 pb-5 sm:px-6')}
          style={hauteur === undefined ? undefined : { minHeight: hauteur }}
        >
          <p className={clsx('text-sm font-medium', TON_ETAT[etat.type])}>{LIBELLE_ETAT[etat.type]}</p>
          <p className="max-w-prose text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {etat.explication}
          </p>
          {expectedSource?.length ? (
            <div className="mt-1 w-full max-w-sm">
              <AdminLabel>Expected source</AdminLabel>
              <RequirementList requis={expectedSource as string[]} />
            </div>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 text-xs font-medium text-accent-600 underline underline-offset-4 hover:text-accent-700 dark:text-accent-400"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      )}
    </Card>
  )
}
