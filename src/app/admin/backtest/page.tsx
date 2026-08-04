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
    return 'Le service a répondu, et son registre ne contient aucune exécution. Rien n’est tracé tant qu’un premier backtest n’existe pas : une performance historique inventée se lirait comme une promesse de rendement.'
  }
  return `Le service a répondu, et aucune exécution n’est disponible : ${reason}. Rien n’est tracé entre-temps — une performance historique inventée se lirait comme une promesse de rendement.`
}

function labelRun(run: Run): string {
  if (run.label === null || run.label === undefined || run.label === '') return 'Exécution sans libellé'
  return run.label
}

function ListeBacktests({ runs }: Readonly<{ runs: readonly Run[] }>) {
  return (
    <AdminGrid>
      <AdminCol span={8}>
        <Card>
          <CardHeader title="Quels backtests ont été exécutés ?" hint={`${runs.length} exécution${runs.length > 1 ? 's' : ''} conservée${runs.length > 1 ? 's' : ''}`} />
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
            quoi="Les backtests n’ont pas pu être lus"
            detail="Le service n’a pas répondu à la requête. Ce silence n’est pas interprété comme la preuve qu’aucun backtest n’existe — il signifie que le registre n’a pas pu être consulté du tout."
            requis={['Une réponse du service']}
          />
        </AdminCol>
      </AdminGrid>
    )
  } else if (none) {
    contenu = (
      <AdminGrid>
        <AdminCol span={7} md={6}>
          <SourceAttendue
            quoi="Aucun backtest n’a été exécuté à ce jour"
            detail={detailBacktestVide(reason)}
            requis={[
              'Une période de référence, avec une date de début et de fin',
              'L’historique de prix des actifs du portefeuille sur cette période',
              'Une exécution du calcul par le service, conservée avec son horodatage',
            ]}
            action={
              block === undefined ? undefined : (
                // The status slot carries what the service actually reported
                // about its register — a real field, not a reassurance.
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  État du registre renvoyé par le service :{' '}
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
      label="Poste de pilotage backtests Hearst Connect"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé backtest">
        <Panel className={gcc.metricCard}>
          <h2>Exécutions</h2>
          <div className={gcc.metricText}><Reading value={runCountCell} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>État de la source</h2>
          <div className={gcc.metricText}><Reading value={editorial(response.ok ? 'Joignable' : 'Indisponible')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Registre</h2>
          <div className={gcc.metricText}><Reading value={editorial(block?.status ?? 'Non renseigné')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Courbe historique</h2>
          <div className={gcc.metricText}><Reading value={editorial(none ? 'Non disponible' : 'Disponible')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Raison</h2>
          <div className={gcc.metricText}><Reading value={editorial(reason ?? 'Aucune')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>État <span>des backtests</span></p>
          <p className={gcc.decisionMeta}>{none ? 'Aucune exécution enregistrée' : 'Exécutions enregistrées'}</p>
          <p className={gcc.decisionActionMuted}>Aucune courbe projetée</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Contenu backtest">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Backtest historique</h2></div>
          <div className={gcc.heroBody}>{contenu}</div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Calcul</h3><p className={gcc.cellText}>Calculé uniquement par le backend.</p></Panel>
          <Panel className={gcc.signalCard}><h3>Lissage</h3><p className={gcc.cellText}>Aucune extrapolation dans l’interface.</p></Panel>
          <Panel className={gcc.signalCard}><h3>Repli</h3><p className={gcc.cellText}>L’absence reste explicite.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes backtest">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Prérequis</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Période de référence</p>
            <p className={gcc.cellText}>Historique de prix sur la période</p>
            <p className={gcc.cellText}>Exécution backend persistée avec horodatage</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Point d’accès</h3><p className={gcc.cellText}>`backtest-historical`</p></article>
          <article className={gcc.infoCell}><h3>Modèle</h3><p className={gcc.cellText}>Aucune exécution simulée injectée.</p></article>
          <article className={gcc.infoCell}><h3>Affichage</h3><p className={gcc.cellText}>Liste des exécutions uniquement quand disponible.</p></article>
          <article className={gcc.infoCell}><h3>État</h3><p className={gcc.cellText}>État du registre affiché depuis la source.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Chemin de couverture</h3>
          <p className={gcc.cellText}>Utilisez `/admin/dashboard` pour l’état de préparation des points d’accès.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
