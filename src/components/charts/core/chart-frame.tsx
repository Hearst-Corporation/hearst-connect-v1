import { AdminLabel } from '@/components/admin/typography'
import { RequirementList } from '@/components/admin/surface'
import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import { Panel, PanelHeader } from '@/components/compositions/panel'
import clsx from 'clsx'

/**
 * Common frame for every chart in the product.
 *
 * A chart is not an image — it's a claim about data. This frame requires,
 * for every chart, what makes the claim verifiable: the question asked in
 * the title, the unit, the provenance, and the state of the data at render
 * time.
 *
 * When the source is unreachable (`indisponible`), only the title and a
 * concise message are shown. Otherwise the chart slot always renders — the
 * adapter draws axes and data when present, or an empty canvas when not.
 * Context for a short or pending series lives in a caption below the slot,
 * not in place of it.
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
  vide: 'Aucune donnée pour cette période',
  attendue: 'En attente de la source',
  indisponible: 'Donnée indisponible',
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
    <Panel tone="chart" className="flex h-full flex-col">
      <PanelHeader title={question} hint={unite} />

      {etat.type === 'indisponible' ? (
        <div
          className={clsx('flex flex-col items-start gap-3 px-5 pb-5 sm:px-6')}
          style={hauteur === undefined ? undefined : { minHeight: hauteur }}
        >
          <div className="flex items-center gap-2">
            <Badge color="rose">{LIBELLE_ETAT[etat.type]}</Badge>
          </div>
          <Text className="max-w-prose text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {etat.explication}
          </Text>
          {expectedSource?.length ? (
            <div className="w-full max-w-sm">
              <AdminLabel>Source attendue</AdminLabel>
              <RequirementList requis={expectedSource as string[]} />
            </div>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-medium text-accent-600 underline underline-offset-4 hover:text-accent-700 dark:text-accent-400"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {children}
          {etat.type !== 'tracee' ? (
            <div className="flex items-start gap-2 px-5 pb-5 sm:px-6">
              <Badge color="zinc">{LIBELLE_ETAT[etat.type]}</Badge>
              <Text className="max-w-prose text-xs leading-relaxed text-zinc-500">
                {etat.explication}
              </Text>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  )
}
