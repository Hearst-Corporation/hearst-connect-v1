import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { publicUser } from '@/lib/session'
import { available, editorial, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = { title: 'Backtests' }
export const dynamic = 'force-dynamic'


function Card({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

function CardHeader({ title, hint }: Readonly<{ title: string; hint: string }>) {
  return (
    <div className={gcc.heroHead}>
      <h3 className={gcc.cardTitle}>{title}</h3>
      <p className={gcc.cellText}>{hint}</p>
    </div>
  )
}

function SourceAttendue({
  quoi,
  detail,
  requis,
  action,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[]; action?: React.ReactNode }>) {
  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroHead}>
        <h3 className={gcc.cardTitle}>{quoi}</h3>
      </div>
      <div className={gcc.heroBody}>
        <p className={gcc.cellText}>{detail}</p>
        {requis.map((item) => (
          <p key={item} className={gcc.cellText}>{item}</p>
        ))}
        {action}
      </div>
    </Panel>
  )
}

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
  const [session, response] = await Promise.all([requireSession(), callBackend<BacktestResponse>('backtest-historical')])
  const user = publicUser(session)
  const block = response.ok ? response.data.runs : undefined
  const runs = block?.value
  const reason = motifLisible(block?.reason)
  // VER-10: the run COUNT is a measurement only when the runs source answered.
  const runCountCell: Availability<string> =
    runs === null || runs === undefined
      ? unavailable({ endpoint: '/api/v1/backtest/historical', status: 'UNAVAILABLE', reason: 'backtest_runs_unreadable' })
      : available(String(runs.length), { provenance: 'live', asOf: null })

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
    <GreenCommandCenterShell
      label="Hearst Connect backtests cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Backtest summary">
        <Panel className={gcc.metricCard}>
          <h2>Runs</h2>
          <div className={gcc.metricText}><Reading value={runCountCell} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Source status</h2>
          <div className={gcc.metricText}><Reading value={editorial(response.ok ? 'Reachable' : 'Unavailable')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Registry</h2>
          <div className={gcc.metricText}><Reading value={editorial(block?.status ?? 'Not reported')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Historical curve</h2>
          <div className={gcc.metricText}><Reading value={editorial(none ? 'Not available' : 'Available')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Reason</h2>
          <div className={gcc.metricText}><Reading value={editorial(reason ?? 'None')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Backtests <span>state</span></p>
          <p className={gcc.decisionMeta}>{none ? 'No run recorded' : 'Runs recorded'}</p>
          <p className={gcc.decisionActionMuted}>No projected curve</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Backtest content">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Backtest historical</h2></div>
          <div className={gcc.heroBody}>{contenu}</div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Computation</h3><p className={gcc.cellText}>Computed by backend only.</p></Panel>
          <Panel className={gcc.signalCard}><h3>Smoothing</h3><p className={gcc.cellText}>No extrapolation in UI.</p></Panel>
          <Panel className={gcc.signalCard}><h3>Fallback</h3><p className={gcc.cellText}>Absence remains explicit.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Backtest notes">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Requirements</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Reference period</p>
            <p className={gcc.cellText}>Price history over period</p>
            <p className={gcc.cellText}>Backend run persisted with timestamp</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Endpoint</h3><p className={gcc.cellText}>`backtest-historical`</p></article>
          <article className={gcc.infoCell}><h3>Model</h3><p className={gcc.cellText}>No mock run injected.</p></article>
          <article className={gcc.infoCell}><h3>Display</h3><p className={gcc.cellText}>Runs list only when available.</p></article>
          <article className={gcc.infoCell}><h3>Status</h3><p className={gcc.cellText}>Registry status shown from source.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Coverage path</h3>
          <p className={gcc.cellText}>Use `/admin/dashboard` for endpoint readiness.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
