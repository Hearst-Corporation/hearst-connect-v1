import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Backtests' }
export const dynamic = 'force-dynamic'

/**
 * Backtests — what the strategy would have produced in the past.
 *
 * No backtest has been run yet: the service says so, and the page leaves it
 * at that. This is the page where the temptation to cheat is strongest — a
 * historical performance curve can be faked in three lines and people like
 * to look at it. It would be pure invention, and an invention that reads
 * like a promise of return.
 *
 * So the chart frame stays visible and empty, with a sentence saying what
 * we expect. The day the service returns a series, it takes the place of
 * the sentence without anything else moving.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type Run = { readonly id?: string; readonly label?: string | null }
type BacktestResponse = { readonly runs?: Resolved<readonly Run[]> }

export default async function Page() {
  const response = await callBackend<BacktestResponse>('backtest-historical')
  const block = response.ok ? response.data.runs : undefined
  const runs = block?.value
  const reason = motifLisible(block?.reason)

  const none = runs === null || runs === undefined || runs.length === 0

  return (
    <AdminPage>
      <PageHeader
        title="Backtests"
        description="What the fund's strategy would have produced over past periods. Everything is computed by the service: nothing here is projected, extrapolated, or smoothed."
      />

      <AdminSection>

      {!response.ok ? (
        <SourceAttendue
          quoi="Backtests could not be read"
          detail="The service did not respond to the request. This silence is not read as proof that no backtest exists."
          requis={['A response from the service']}
        />
      ) : (
        <>
          <ChartFrame
            question="What would the strategy have produced in the past?"
            unite="in unit value, per period"
            etat={{
              type: 'attendue',
              explication:
                reason === undefined
                  ? 'No backtest has been run yet. Until one exists, no curve is plotted: an invented historical performance would read as a promise of return.'
                  : `No curve is plotted: ${reason}. An invented historical performance would read as a promise of return.`,
            }}
            hauteur="h-64"
          />

          {none ? (
            <SourceAttendue
              quoi="No backtest has been run to date"
              detail="This page is ready: as soon as a first backtest is run, its results will appear here without any further action. Until then, it shows no figures."
              requis={[
                'A reference period chosen, with a start and end date',
                'The price history of the portfolio assets over that period',
                'An execution of the calculation by the service, kept with its timestamp',
              ]}
            />
          ) : (
            <Card>
              <CardHeader
                title="Which backtests have been run?"
                hint={`${runs.length} run${runs.length > 1 ? 's' : ''} kept`}
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                {runs.map((run, rank) => (
                  <li key={run.id ?? String(rank)} className="px-5 py-3.5 text-sm text-zinc-950 dark:text-white">
                    {run.label === null || run.label === undefined || run.label === ''
                      ? 'Unlabeled run'
                      : run.label}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* The basement: the detailed response for anyone who wants to check a field. */}
      </AdminSection>
    </AdminPage>
  )
}
