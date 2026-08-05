import { ConsoleShell, gcc } from '@/components/layout/console-shell'
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

export const metadata: Metadata = { title: 'Activité' }
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
      label="Activité — Espace Hearst Connect"
      rail={<AppRail currentHref="/espace/activite" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé de l’activité">
        <MetricCard titre="Mouvements" valeur={movementCount} trend={movementTrend} />
        <MetricCard titre="Écritures financières" valeur={financialCount} />
        <MetricCard titre="Dernier" valeur={readable ? editorial(ilYA(last)) : mapAvailability(eventsAvail, () => '—')} />
        <MetricCard titre="Types" valeur={typesCount} />
        <MetricCard titre="État de la source" valeur={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} />
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Journal <span>d’activité</span></p>
          <p className={gcc.decisionMeta}>Journal chronologique de la chaîne</p>
          <p className={gcc.decisionActionMuted}>Aucun mouvement synthétique</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Journal d’activité">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Ce qui s’est passé</h2></div>
          <div className={gcc.heroBody}>
            <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel tone="plain" className={gcc.signalCard}><h3>Mouvement récent</h3><p className={gcc.cellText}>{dateLisible(last)}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Ordre du flux</h3><p className={gcc.cellText}>Du plus récent au plus ancien</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Règle des montants</h3><p className={gcc.cellText}>Pas de montant ne signifie pas un zéro forcé.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes d’activité">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Contrat du journal</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Chaque ligne correspond à une écriture de mouvement du service.</p>
            <p className={gcc.cellText}>Aucun total inter-types n’est présenté.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Point d’accès</h3><p className={gcc.cellText}>Journal des mouvements du service</p></article>
          <article className={gcc.infoCell}><h3>Ordre</h3><p className={gcc.cellText}>Du plus récent au plus ancien</p></article>
          <article className={gcc.infoCell}><h3>Montant</h3><p className={gcc.cellText}>Affiché uniquement quand porté par la source.</p></article>
          <article className={gcc.infoCell}><h3>Véracité</h3><p className={gcc.cellText}>Les comptes héritent de la fraîcheur de la source.</p></article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Votre espace</h3>
          <p className={gcc.cellText}>Le tableau de bord réunit la couverture de vos données.</p>
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
        quoi="Le journal des mouvements n’a pas pu être lu"
        detail="Le service n’a pas répondu à la requête. Aucun mouvement n’est supposé : une liste vide se lirait à tort comme « rien ne s’est passé »."
        requis={['Une réponse du service']}
      />
    )
  }
  if (mouvements === null || mouvements === undefined || mouvements.length === 0) {
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
            <MetricValue valeur={formatNumber(mouvements.length)} libelle="Mouvements enregistrés" />
          </Panel>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="Types distincts" value={repartition.length} />
            <AdminMetric label="Avec un montant" value={financiers.length === 0 ? 'aucun' : formatNumber(financiers.length)} />
            <AdminMetric label="Dernier mouvement" value={dernierIlYA === '—' ? null : dernierIlYA} />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      <AdminTableSplit
        main={
          <Panel>
            <PanelHeader title="Que s’est-il passé ?" hint="Du plus récent au plus ancien" />
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
              title="De quoi ce journal est-il fait ?"
              hint={`${mouvements.length} mouvement${mouvements.length > 1 ? 's' : ''} répartis sur ${repartition.length} type${repartition.length > 1 ? 's' : ''}`}
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
            investisseur <span className="font-mono text-zinc-600 dark:text-zinc-400">{investisseur}</span>
          </span>
        ) : null}
        {bloc === null || bloc === undefined || bloc === '' ? null : <span className="tabular-nums">bloc {formatNumber(Number(bloc))}</span>}
        <span>{dateLisible(mouvement.occurredAt)}</span>
      </div>
    </li>
  )
}
