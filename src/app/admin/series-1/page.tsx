import { Card, CardHeader, HeroFigure, SourceAttendue } from '@/components/admin/cockpit'
import { AdminCol, AdminGrid, AdminMetricGrid, AdminTableSplit } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminMetric } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
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
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Series 1 Log' }
export const dynamic = 'force-dynamic'

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
      ? 'the chain hasn’t deposited anything for this fund yet. This isn’t an outage.'
      : `${motif}. This isn’t an outage.`
  return (
    <SourceAttendue
      quoi="No movement recorded to date"
      detail={`The log was checked and it's empty: ${suffixe}`}
      requis={['A first movement recorded on the chain']}
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
        quoi="The movement log could not be read"
        detail="The service did not respond to the request. No movement is assumed: an empty list would wrongly read as “nothing happened”."
        requis={['A response from the service']}
      />
    )
  }
  if (mouvements === null || mouvements === undefined || mouvements.length === 0) {
    return <JournalVide motif={motif} />
  }
  return <JournalSerie1 mouvements={mouvements} />
}

export default async function Page() {
  const reponse = await callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } })
  const bloc = reponse.ok ? reponse.data.events : undefined
  const mouvements = bloc?.value

  return (
    <AdminPage>
      <PageHeader
        title="Series 1 Log"
        description="Every movement the chain has recorded for the Series 1 fund, most recent to oldest. Each line comes straight from the service — nothing here is aggregated, estimated, or totalled across movement types."
      />

      <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />
    </AdminPage>
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
            <HeroFigure valeur={formatNumber(mouvements.length)} libelle="Movements recorded" />
          </Card>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="Distinct types" value={repartition.length} />
            <AdminMetric
              label="With an amount"
              value={financiers.length === 0 ? 'none' : formatNumber(financiers.length)}
            />
            <AdminMetric label="Last movement" value={dernierIlYA === '—' ? null : dernierIlYA} />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      <AdminTableSplit
        main={
          <Card>
            <CardHeader title="What happened?" hint="Most recent first" />
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
              title="What is this log made of?"
              hint={`${mouvements.length} movement${mouvements.length > 1 ? 's' : ''} across ${repartition.length} type${repartition.length > 1 ? 's' : ''}`}
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
            investor <span className="font-mono text-zinc-600 dark:text-zinc-400">{investisseur}</span>
          </span>
        ) : null}
        {bloc === null || bloc === undefined || bloc === '' ? null : (
          <span className="tabular-nums">block {Number(bloc).toLocaleString('en-US')}</span>
        )}
        <span>{dateLisible(mouvement.occurredAt)}</span>
      </div>
    </li>
  )
}
