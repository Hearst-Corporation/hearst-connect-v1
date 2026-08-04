import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid, AdminMetricGrid, AdminTableSplit } from '@/components/admin/grid'
import { AdminMetric } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import {
  adresseCourte,
  dateLisible,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import { publicUser } from '@/lib/session'
import { available, editorial, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Journal Series 1' }
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

function HeroFigure({ valeur, libelle }: Readonly<{ valeur: string; libelle: string }>) {
  return (
    <div>
      <p className={gcc.metricValue}>{valeur}</p>
      <p className={gcc.cellText}>{libelle}</p>
    </div>
  )
}

function SourceAttendue({ quoi, detail, requis }: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
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
      </div>
    </Panel>
  )
}

/**
 * Series 1 Log — the fund's journal, read as a narrative.
 *
 * This is the only page in the product whose source is fully fed: the chain
 * deposits every movement here, and the service returns them as-is. So they
 * aren't summarized into counters — they're told, most recent to oldest, one
 * sentence per movement.
 *
 * Two readings coexist: the chronological feed, which answers "what
 * happened", and the breakdown by type, which answers "what is this log made
 * of". No total is computed here: adding a deposit to a mining statement
 * would produce a number that means nothing.
 *
 * ── Composition ────────────────────────────────────────────────────────────
 * The screen is opened from the Administration index, not from the sidebar,
 * so the H1 and its description have to introduce the log on their own.
 *
 * Under the title, two declared blocks on the 12-column grid: the count of
 * movements as the primary measure on 5 columns with its three supporting
 * measures balanced across the remaining 7, then the feed on 8 columns with
 * the breakdown by type in the secondary column. The feed is the long
 * content on this page, so it takes the main span; the breakdown is a
 * summary of it and belongs beside it, not above it.
 */

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber?: string | null
  readonly txHash?: string | null
  readonly investorAddress?: string | null
  readonly assetAmountAtomic?: string | null
  readonly shareAmountAtomic?: string | null
  readonly occurredAt?: string | null
}

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type ReponseEvenements = { readonly events?: Resolu<readonly Mouvement[]> }

/** Does a movement carry a financial amount? A technical statement doesn't. */
const estFinancier = (m: Mouvement): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

function JournalVide({ motif }: Readonly<{ motif: string | undefined }>) {
  const suffixe =
    motif === undefined
      ? 'la chaîne n’a encore rien déposé pour ce fonds. Ce n’est pas une panne.'
      : `${motif}. Ce n’est pas une panne.`
  return (
    <SourceAttendue
      quoi="Aucun mouvement enregistré à ce jour"
      detail={`Le journal a été vérifié et il est vide : ${suffixe}`}
      requis={['Un premier mouvement enregistré sur la chaîne']}
    />
  )
}

/**
 * One absence, stated once. An unread log and an empty log are two different
 * facts, so they get two different sentences — but never two stacked states
 * saying the same thing.
 */
function CorpsJournal({
  reponseOk,
  mouvements,
  motif,
}: Readonly<{ reponseOk: boolean; mouvements: readonly Mouvement[] | null | undefined; motif: string | undefined }>) {
  if (!reponseOk) {
    return (
      <SourceAttendue
        quoi="Le journal des mouvements n’a pas pu être lu"
        detail="Le service n’a pas répondu à la requête. Aucun mouvement n’est supposé : une liste vide se lirait à tort comme « rien ne s’est passé »."
        requis={['Une réponse du service']}
      />
    )
  }
  if (mouvements === null || mouvements === undefined || mouvements.length === 0) {
    return <JournalVide motif={motif} />
  }
  return <JournalSerie1 mouvements={mouvements} />
}

export default async function Page() {
  const [session, reponse] = await Promise.all([
    requireSession(),
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } }),
  ])
  const user = publicUser(session)
  const bloc = reponse.ok ? reponse.data.events : undefined
  const mouvements = bloc?.value
  // VER-10 / VER-12: counts are measurements only when the events source was
  // read. An unread source is a named absence, never "0" nor the string
  // "Unavailable" badged as a live value.
  const eventsUnavailable = unavailable({ endpoint: '/api/v1/series1/events', status: 'UNAVAILABLE', reason: 'events_source_unreachable' })
  const readable = mouvements !== null && mouvements !== undefined
  const movementCount: Availability<string> = readable
    ? available(String(mouvements.length), { provenance: 'live', asOf: null })
    : eventsUnavailable
  const financialCount: Availability<string> = readable
    ? available(String(mouvements.filter(estFinancier).length), { provenance: 'live', asOf: null })
    : eventsUnavailable
  const typesCount: Availability<string> = readable
    ? available(String(new Set(mouvements.map((m) => m.eventName)).size), { provenance: 'live', asOf: null })
    : eventsUnavailable
  const last = mouvements?.[0]?.occurredAt ?? null

  return (
    <GreenCommandCenterShell
      label="Poste de pilotage series 1 Hearst Connect"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé Series 1">
        <Panel className={gcc.metricCard}>
          <h2>Mouvements</h2>
          <div className={gcc.metricText}><Reading value={movementCount} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Écritures financières</h2>
          <div className={gcc.metricText}><Reading value={financialCount} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Dernier</h2>
          <div className={gcc.metricText}><Reading value={readable ? editorial(ilYA(last)) : eventsUnavailable} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Types</h2>
          <div className={gcc.metricText}><Reading value={typesCount} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>État de la source</h2>
          <div className={gcc.metricText}><Reading value={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} className={gcc.metricValue} /></div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Journal <span>Series 1</span></p>
          <p className={gcc.decisionMeta}>Journal chronologique de la chaîne</p>
          <p className={gcc.decisionActionMuted}>Aucun mouvement synthétique</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Journal Series 1">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Journal Series 1</h2>
          </div>
          <div className={gcc.heroBody}>
            <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}>
            <h3>Mouvement récent</h3>
            <p className={gcc.cellText}>{dateLisible(last)}</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Ordre du flux</h3>
            <p className={gcc.cellText}>Du plus récent au plus ancien</p>
          </Panel>
          <Panel className={gcc.signalCard}>
            <h3>Règle des montants</h3>
            <p className={gcc.cellText}>Pas de montant ne signifie pas un zéro forcé.</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes Series 1">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Contrat du journal</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Chaque ligne correspond à une écriture de mouvement du backend.</p>
            <p className={gcc.cellText}>Aucun total inter-types n’est présenté.</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Point d’accès</h3><p className={gcc.cellText}>`series1-events`</p></article>
          <article className={gcc.infoCell}><h3>Ordre</h3><p className={gcc.cellText}>Du plus récent au plus ancien</p></article>
          <article className={gcc.infoCell}><h3>Montant</h3><p className={gcc.cellText}>Affiché uniquement quand porté par la source.</p></article>
          <article className={gcc.infoCell}><h3>Repli</h3><p className={gcc.cellText}>Aucune ligne fabriquée.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Couverture des données</h3>
          <p className={gcc.cellText}>Utilisez `/admin/dashboard` pour l’état au niveau des points d’accès.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}

function JournalSerie1({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  // Breakdown by type. A horizontal bar reads from the first element on,
  // unlike a pie slice among six categories.
  const parNature = new Map<string, number>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const vu = parNature.get(nom)
    parNature.set(nom, vu === undefined ? 1 : vu + 1)
  }
  const repartition = [...parNature.entries()].sort((a, b) => b[1] - a[1])
  const maximum = repartition[0][1]

  const financiers = mouvements.filter(estFinancier)
  const dernier = mouvements[0]

  // `ilYA` already renders '—' when the chain gave no timestamp; handing the
  // tile a null instead lets it style the absence like every other one.
  const dernierIlYA = ilYA(dernier.occurredAt)

  return (
    <>
      {/* The count of movements is the page's primary measure and keeps the
          wide span; the three facts that qualify it are equal tiles, and
          `count` keeps their row full rather than stranding one on the left. */}
      <AdminGrid>
        <AdminCol span={5}>
          <Card className="h-full p-6">
            <HeroFigure valeur={formatNumber(mouvements.length)} libelle="Mouvements enregistrés" />
          </Card>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="Types distincts" value={repartition.length} />
            <AdminMetric
              label="Avec un montant"
              value={financiers.length === 0 ? 'aucun' : formatNumber(financiers.length)}
            />
            <AdminMetric label="Dernier mouvement" value={dernierIlYA === '—' ? null : dernierIlYA} />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      <AdminTableSplit
        main={
          <Card>
            <CardHeader title="Que s’est-il passé ?" hint="Du plus récent au plus ancien" />
            <ol className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              {mouvements.map((m) => (
                <LigneMouvement key={m.id} mouvement={m} />
              ))}
            </ol>
          </Card>
        }
        aside={
          <Card>
            <CardHeader
              title="De quoi ce journal est-il fait ?"
              hint={`${mouvements.length} mouvement${mouvements.length > 1 ? 's' : ''} répartis sur ${repartition.length} type${repartition.length > 1 ? 's' : ''}`}
            />
            <ul className="space-y-3 px-5 pb-5 sm:px-6">
              {repartition.map(([nom, nombre]) => (
                <li key={nom}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-zinc-600 dark:text-zinc-300">{nom}</span>
                    <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{nombre}</span>
                  </div>
                  {/* Mint, not a semantic hue: a movement type is ordinary
                      data and says nothing about health. */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-accent-400"
                      style={{ width: `${Math.round((nombre / maximum) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        }
      />
    </>
  )
}

/**
 * One line = one sentence. The amount, the investor, and the block number
 * only show up if the chain supplied them: a missing field disappears, it
 * doesn't leave an orphan dash in a narrative.
 */
function LigneMouvement({ mouvement }: Readonly<{ mouvement: Mouvement }>) {
  const investisseur = adresseCourte(mouvement.investorAddress)
  const bloc = mouvement.blockNumber

  return (
    <li className="px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-zinc-950 dark:text-white">{phraseMouvement(mouvement.eventName)}</span>
        {estFinancier(mouvement) ? (
          <span className="text-sm font-semibold text-accent-600 tabular-nums dark:text-accent-300">
            {montantUsdc(mouvement.assetAmountAtomic)}
          </span>
        ) : null}
        <span
          className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
          title={dateLisible(mouvement.occurredAt)}
        >
          {ilYA(mouvement.occurredAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {investisseur !== null ? (
          <span>
            investisseur <span className="font-mono text-zinc-600 dark:text-zinc-400">{investisseur}</span>
          </span>
        ) : null}
        {bloc === null || bloc === undefined || bloc === '' ? null : (
          <span className="tabular-nums">bloc {formatNumber(Number(bloc))}</span>
        )}
        <span>{dateLisible(mouvement.occurredAt)}</span>
      </div>
    </li>
  )
}
