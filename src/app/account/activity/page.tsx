import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { MetricCard, MetricValue, Panel, PanelHeader, SourceAttendue } from '@/components/compositions'
import { AppRail } from '@/components/layout/app-rail'
import { MuiDistributionChart } from '@/components/charts'
import { AdminCol, AdminGrid, AdminMetricGrid, AdminTableSplit } from '@/components/admin/grid'
import { AdminMetric } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
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
import { editorial, mapAvailability, measuredCount } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

/**
 * Activité — surface USER.
 *
 * Le journal du fonds, lu comme un récit : chaque mouvement déposé par la
 * chaîne, du plus récent au plus ancien, une phrase par mouvement. Même
 * endpoint session-tier (`series1-events`) et même Design System que
 * `/admin/series-1`, resserré pour le propriétaire.
 *
 * Véracité par construction (corrige F-05 à la source) : les comptes dérivent du
 * STATUT réel via `availabilityFromResolu` + `measuredCount`, jamais d'un
 * `provenance:'live'` en dur. Aucun total inter-types (additionner un dépôt et
 * un relevé de minage ne veut rien dire). Un montant n'apparaît que si la source
 * le porte — jamais un zéro forcé.
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

const estFinancier = (m: Mouvement): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

export default async function Page() {
  const [session, reponse] = await Promise.all([
    requireSession(),
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } }),
  ])
  const user = publicUser(session)
  const bloc = reponse.ok ? reponse.data.events : undefined
  const mouvements = bloc?.value

  // Véracité : chaque compte dérive du statut réel de la source, jamais forcé "live".
  const eventsAvail = availabilityFromResolu<readonly Mouvement[]>(bloc, '/api/v1/series1/events')
  const movementCount = measuredCount(eventsAvail)
  const financialCount = measuredCount(mapAvailability(eventsAvail, (list) => list.filter(estFinancier)))
  const typesCount = mapAvailability(eventsAvail, (list) => String(new Set(list.map((m) => m.eventName)).size))
  const last = mouvements?.[0]?.occurredAt ?? null
  const readable = mouvements !== null && mouvements !== undefined
  const trendEligible =
    eventsAvail.kind === 'available' && !eventsAvail.stale && readable && mouvements.length >= 2
  const movementTrend = trendEligible
    ? Object.values(
        mouvements.reduce((acc: Record<string, number>, m) => {
          const day = m.occurredAt?.split('T')[0] ?? 'unknown'
          const count = acc[day]
          acc[day] = (typeof count === 'number' ? count : 0) + 1
          return acc
        }, {}),
      )
        .slice(-7)
        .reverse()
    : undefined

  return (
    <ConsoleShell
      label="Activity — Hearst Connect Account"
      rail={<AppRail currentHref="/account/activity" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Activity summary">
        <MetricCard titre="Movements" valeur={movementCount} trend={movementTrend} />
        <MetricCard titre="Financial entries" valeur={financialCount} />
        <MetricCard titre="Latest" valeur={readable ? editorial(ilYA(last)) : mapAvailability(eventsAvail, () => '—')} />
        <MetricCard titre="Types" valeur={typesCount} />
        <MetricCard titre="Source status" valeur={editorial(reponse.ok ? 'Reachable' : 'Unavailable')} />
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Activity <span>journal</span></p>
          <p className={csl.decisionMeta}>Chronological on-chain journal</p>
          <p className={csl.decisionActionMuted}>No synthetic movements</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Activity journal">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>What happened</h2></div>
          <div className={csl.heroBody}>
            <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Recent movement</h3><p className={csl.cellText}>{dateLisible(last)}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Flow order</h3><p className={csl.cellText}>Newest to oldest</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Amount rule</h3><p className={csl.cellText}>No amount does not mean a forced zero.</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Activity notes">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Journal contract</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Each line is a movement entry from the service.</p>
            <p className={csl.cellText}>No cross-type totals are shown.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Endpoint</h3><p className={csl.cellText}>Service movement journal</p></article>
          <article className={csl.infoCell}><h3>Order</h3><p className={csl.cellText}>Newest to oldest</p></article>
          <article className={csl.infoCell}><h3>Amount</h3><p className={csl.cellText}>Shown only when carried by the source.</p></article>
          <article className={csl.infoCell}><h3>Veracity</h3><p className={csl.cellText}>Counts inherit their source freshness.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Your account</h3>
          <p className={csl.cellText}>The dashboard brings together your data coverage.</p>
        </Panel>
      </section>
    </ConsoleShell>
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
        quoi="The movement journal could not be read"
        detail="The service did not respond. No movement is assumed: an empty list would wrongly read as nothing happened."
        requis={['A response from the service']}
      />
    )
  }
  if (mouvements === null || mouvements === undefined || mouvements.length === 0) {
    const suffixe =
      motif === undefined
        ? 'the chain has not deposited anything for this fund yet. This is not an outage.'
        : `${motif}. This is not an outage.`
    return (
      <SourceAttendue
        quoi="No movements recorded to date"
        detail={`The journal was checked and is empty: ${suffixe}`}
        requis={['A first movement recorded on-chain']}
      />
    )
  }
  return <Journal mouvements={mouvements} />
}

function Journal({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  const parNature = new Map<string, number>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const vu = parNature.get(nom)
    parNature.set(nom, vu === undefined ? 1 : vu + 1)
  }
  const repartition = [...parNature.entries()].sort((a, b) => b[1] - a[1])
  const financiers = mouvements.filter(estFinancier)
  const dernierIlYA = ilYA(mouvements[0].occurredAt)

  return (
    <>
      <AdminGrid>
        <AdminCol span={5}>
          <Panel tone="plain" className="h-full p-6">
            <MetricValue valeur={formatNumber(mouvements.length)} libelle="Recorded movements" />
          </Panel>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="Distinct types" value={repartition.length} />
            <AdminMetric label="With an amount" value={financiers.length === 0 ? 'none' : formatNumber(financiers.length)} />
            <AdminMetric label="Latest movement" value={dernierIlYA === '—' ? null : dernierIlYA} />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      <AdminTableSplit
        main={
          <Panel>
            <PanelHeader title="What happened?" hint="Newest to oldest" />
            <ol className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              {mouvements.map((m) => (
                <LigneMouvement key={m.id} mouvement={m} />
              ))}
            </ol>
          </Panel>
        }
        aside={
          <Panel>
            <PanelHeader
              title="What is this journal made of?"
              hint={`${mouvements.length} movement${mouvements.length > 1 ? 's' : ''} across ${repartition.length} type${repartition.length > 1 ? 's' : ''}`}
            />
            <MuiDistributionChart items={repartition.map(([label, value]) => ({ label, value }))} unit=" mov." />
          </Panel>
        }
      />
    </>
  )
}

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
        <span className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400" title={dateLisible(mouvement.occurredAt)}>
          {ilYA(mouvement.occurredAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {investisseur !== null ? (
          <span>
            investor <span className="font-mono text-zinc-600 dark:text-zinc-400">{investisseur}</span>
          </span>
        ) : null}
        {bloc === null || bloc === undefined || bloc === '' ? null : <span className="tabular-nums">block {formatNumber(Number(bloc))}</span>}
        <span>{dateLisible(mouvement.occurredAt)}</span>
      </div>
    </li>
  )
}
