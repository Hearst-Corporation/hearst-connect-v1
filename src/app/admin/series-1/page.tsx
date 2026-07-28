import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
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
        description="Everything the chain has recorded for this fund, most recent to oldest. Every line comes from the service; nothing here is aggregated or estimated."
      />

      <AdminSection>

      <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />

      {/* Below the fold: the detailed response stays available for anyone who
          wants to verify a field, never forced on whoever comes to read the log. */}
      </AdminSection>
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

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <HeroFigure valeur={mouvements.length.toLocaleString('en-US')} libelle="Movements recorded" />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SideFact libelle="Distinct types" valeur={String(repartition.length)} />
            <SideFact
              libelle="With an amount"
              valeur={financiers.length === 0 ? 'none' : String(financiers.length)}
            />
            <SideFact libelle="Last movement" valeur={ilYA(dernier.occurredAt)} />
          </dl>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="What is this log made of?"
            hint={`${mouvements.length} movement${mouvements.length > 1 ? 's' : ''} across ${repartition.length} type${repartition.length > 1 ? 's' : ''}`}
          />
          <ul className="space-y-3 px-5 py-4">
            {repartition.map(([nom, nombre]) => (
              <li key={nom}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-xs text-zinc-600 dark:text-zinc-300">{nom}</span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{nombre}</span>
                </div>
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

        <Card className="lg:col-span-2">
          <CardHeader title="What happened?" hint="Most recent first" />
          <ol className="divide-y divide-zinc-950/5 dark:divide-white/5">
            {mouvements.map((m) => (
              <LigneMouvement key={m.id} mouvement={m} />
            ))}
          </ol>
        </Card>
      </div>
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
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-white">{phraseMouvement(mouvement.eventName)}</span>
        {estFinancier(mouvement) ? (
          <span className="text-sm font-semibold text-accent-300 tabular-nums">
            {montantUsdc(mouvement.assetAmountAtomic)}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-xs text-zinc-500" title={dateLisible(mouvement.occurredAt)}>
          {ilYA(mouvement.occurredAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-500">
        {investisseur !== null ? (
          <span>
            investor <span className="font-mono text-zinc-400">{investisseur}</span>
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
