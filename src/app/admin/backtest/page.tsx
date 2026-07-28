import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminPage } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import type { Metadata } from 'next'
import React from 'react'

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
 * ── Why there is no empty chart frame any more ────────────────────────────
 * The rejected version said the same absence twice: an empty chart frame
 * ("waiting on the source") stacked on top of a requirements panel ("no
 * backtest has been run"). Two large surfaces, one message, a full viewport
 * spent on it. An absence is stated once. A chart canvas with no series in
 * it is not honesty, it is scenery — so the frame is gone entirely, and the
 * page renders ONE composed state: what is missing, why nothing is drawn,
 * and the three things that have to exist before a curve can be.
 *
 * ── Two absences, not one ─────────────────────────────────────────────────
 * "The service did not answer" and "the service answered and holds no run"
 * are different truths, and collapsing them would let a real outage read as
 * an empty product. They keep separate branches and separate wording.
 *
 * The day the service returns runs, the populated branch takes over and
 * nothing else on the page moves.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type Run = { readonly id?: string; readonly label?: string | null }
type BacktestResponse = { readonly runs?: Resolved<readonly Run[]> }

function detailBacktestVide(reason: string | undefined): string {
  if (reason === undefined) {
    return 'The service answered, and its register holds no run. Nothing is plotted until a first backtest exists: an invented historical performance would read as a promise of return.'
  }
  return `The service answered, and no run is available: ${reason}. Nothing is plotted in the meantime — an invented historical performance would read as a promise of return.`
}

function labelRun(run: Run): string {
  if (run.label === null || run.label === undefined || run.label === '') return 'Unlabeled run'
  return run.label
}

function ListeBacktests({ runs }: Readonly<{ runs: readonly Run[] }>) {
  return (
    <AdminGrid>
      <AdminCol span={8}>
        <Card>
          <CardHeader title="Which backtests have been run?" hint={`${runs.length} run${runs.length > 1 ? 's' : ''} kept`} />
          <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
            {runs.map((run, rank) => (
              <li
                key={run.id ?? String(rank)}
                className="px-5 py-3.5 text-sm text-zinc-950 sm:px-6 dark:text-white"
              >
                {labelRun(run)}
              </li>
            ))}
          </ul>
        </Card>
      </AdminCol>
    </AdminGrid>
  )
}

export default async function Page() {
  const response = await callBackend<BacktestResponse>('backtest-historical')
  const block = response.ok ? response.data.runs : undefined
  const runs = block?.value
  const reason = motifLisible(block?.reason)

  const none = runs === null || runs === undefined || runs.length === 0

  let contenu: React.ReactNode
  if (!response.ok) {
    contenu = (
      <AdminGrid>
        <AdminCol span={7} md={6}>
          <SourceAttendue
            quoi="Backtests could not be read"
            detail="The service did not respond to the request. This silence is not read as proof that no backtest exists — it means the register could not be consulted at all."
            requis={['A response from the service']}
          />
        </AdminCol>
      </AdminGrid>
    )
  } else if (none) {
    contenu = (
      <AdminGrid>
        <AdminCol span={7} md={6}>
          <SourceAttendue
            quoi="No backtest has been run to date"
            detail={detailBacktestVide(reason)}
            requis={[
              'A reference period, with a start and an end date',
              'The price history of the portfolio assets over that period',
              'One execution of the calculation by the service, kept with its timestamp',
            ]}
            action={
              block === undefined ? undefined : (
                // The status slot carries what the service actually reported
                // about its register — a real field, not a reassurance.
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Register status returned by the service:{' '}
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{block.status}</span>
                </p>
              )
            }
          />
        </AdminCol>
      </AdminGrid>
    )
  } else {
    contenu = <ListeBacktests runs={runs} />
  }

  return (
    <AdminPage>
      <PageHeader
        title="Backtests"
        description="What the fund's strategy would have produced over past periods. Everything is computed by the service: nothing here is projected, extrapolated, or smoothed."
      />

      {/* Every branch declares its span. A stated absence is a paragraph, not
          a banner — seven columns is the measure it reads best at, and the
          five remaining columns are deliberate whitespace. */}
      {contenu}
    </AdminPage>
  )
}
