import { AdminLabel } from '@/components/admin/typography'
import { RequirementList } from '@/components/admin/surface'
import { chartTheme } from '@/lib/chart-theme'
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
 * message — never a fake set of axes pretending data exists.
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
  hauteur = chartTheme.height.medium,
  expectedSource,
  onRetry,
  retryLabel = 'Retry',
  children,
}: Readonly<{
  question: string
  unite: string
  etat: EtatSerie
  hauteur?: string
  expectedSource?: readonly string[]
  onRetry?: () => void
  retryLabel?: string
  children?: React.ReactNode
}>) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={question} hint={unite} />

      {etat.type === 'tracee' ? (
        children
      ) : (
        <div className={clsx(hauteur, 'flex flex-col items-center justify-center gap-3 px-6 py-8 text-center')}>
          <p className={clsx('text-sm font-medium', TON_ETAT[etat.type])}>{LIBELLE_ETAT[etat.type]}</p>
          <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{etat.explication}</p>
          {expectedSource?.length ? (
            <div className="mt-1 w-full max-w-sm rounded-lg bg-zinc-50 px-4 py-3 text-left ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:ring-white/5">
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
