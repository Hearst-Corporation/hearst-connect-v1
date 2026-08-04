import { MiningProductionChart, type MoisProduit } from '@/components/charts/cartesian/mining-production-chart'
import { MetricValue, Panel, PanelHeader, SideFact, SourceAttendue } from '@/components/compositions'
import { ChartFrame, type EtatSerie } from '@/components/charts/core/chart-frame'
import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { plottableAsChart } from '@/components/charts/core/chart-theme'
import { adresseCourte, dateLisible, ilYA, libelleMouvement, montantUsdc } from '@/lib/mouvements'
import { formatCurrency, formatNumber } from '@/lib/format'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import { available, editorial, unavailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mining' }
export const dynamic = 'force-dynamic'

/**
 * Mining — does production pay the bill?
 *
 * The previous screen laid out three blocks backed by three routes: power,
 * bitcoin, electricity. Each was accurate; together they said nothing.
 * Mining has only one question, and it ties the three together: does what
 * the fleet produces cover what it consumes.
 *
 * ── What the console computes, and what it refuses to conclude ─────────────
 * Two values are measured and published: the bitcoin attested for the month
 * (contract, via the BTC aggregate) and the monthly electricity bill
 * (contract). Their quotient is a THRESHOLD — the bitcoin price above which
 * the month is covered. It's a division of two measurements, not a guess.
 *
 * What the console does NOT do: say whether the threshold is cleared. That
 * would take the bitcoin price, which the service exposes on no route. The
 * backend does ingest a market table (hashprice, bitcoin price, difficulty)
 * — verified this day, no field publishes it over HTTP. The profitability
 * chart's frame therefore stays in place, and it names what's missing.
 *
 * ── Why three routes for one page ───────────────────────────────────────
 * `mining` gives the instantaneous state (power, bill, operation), `btc` the
 * only real time series of production, `series1-events` the timeline of
 * attestations. The page follows the question, not the service's split.
 *
 * ── How the page is composed ──────────────────────────────────────────────
 * Four sections on the 12-column grid, each block declaring its own span so
 * nothing lands wherever the grid had room left. A section is not a card: the
 * rule above its title separates it, and the cards inside it are the only
 * surfaces. The two questions the service publishes no answer for used to sit
 * as empty frames in the middle of dense sections; they are grouped in one
 * closing section instead, stated once.
 *
 * ── One month is not a trend ──────────────────────────────────────────────
 * The production series currently holds a single reported month. A lone bar
 * inside a full plot area reads as a chart with missing data, so below two
 * ordered observations (`plottableAsChart`) the frame renders the measurement
 * itself — value, period, and a sentence saying that no trend is measurable
 * yet. The frame does not change: the question and the unit are owed to the
 * reader in both cases.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Releve = {
  readonly reportedHashrateTh?: string | null
  readonly totalBtcEarnedSats?: string | null
  readonly lastReportTime?: string | null
}

type Electricite = {
  readonly monthlyCost?: string | null
  readonly payee?: string | null
  readonly totalPaid?: string | null
  readonly lastPayment?: string | null
  readonly nextEligiblePayment?: string | null
  readonly canPay?: boolean | null
}

type Exploitation = {
  readonly currentMonth?: number | null
  readonly productDurationMonths?: number | null
  readonly fleetActive?: boolean | null
  readonly curtailed?: boolean | null
}

type Chaine = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
}

type Minage = {
  readonly runtime?: Chaine
  readonly hashrate?: Resolu<Releve>
  readonly btcEarned?: Resolu<Releve>
  readonly electricity?: Resolu<Electricite>
  readonly curtailment?: Resolu<Exploitation>
  readonly engine?: Resolu<Exploitation>
  readonly operationalTelemetry?: Resolu<unknown>
}

type MoisBackend = {
  readonly period?: string | null
  readonly satsEarned?: string | null
  readonly cumulativeSatsEarned?: string | null
}

type Production = {
  readonly monthly?: readonly MoisBackend[] | null
  readonly cumulativeSatsEarned?: string | null
  readonly cumulativeBtcEarned?: string | null
}

type Btc = { readonly production?: Resolu<Production> }

type Mouvement = {
  readonly id?: string | null
  readonly eventName?: string | null
  readonly occurredAt?: string | null
  readonly assetAmountAtomic?: string | null
  readonly txHash?: string | null
}

type Series1 = { readonly events?: Resolu<readonly Mouvement[]> }

/**
 * Reasons specific to mining. `no_telemetry_rows` deserves its own sentence: this
 * isn't a missing source, it's a table that's wired up and has not yet received
 * a single row. The nuance decides what to ask the operator for.
 */
const MOTIFS_MINAGE: Record<string, string> = {
  ...MOTIF_SERIE,
  no_telemetry_rows: 'la table de télémétrie est raccordée, et aucune lecture n’y a encore été enregistrée',
}

/* ── Conversions ─────────────────────────────────────────────────────────── */

/** Whole satoshis → bitcoin. A missing value renders `null`, never zero. */
function btcDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || sats === '') return null
  const brut = Number(sats)
  return Number.isFinite(brut) ? brut / 100_000_000 : null
}

/** Atomic USDC (6 decimals) → dollars. Missing: `null`. */
function dollarsDepuisAtomique(atomique: string | null | undefined): number | null {
  if (typeof atomique !== 'string' || atomique === '') return null
  const brut = Number(atomique)
  return Number.isFinite(brut) ? brut / 1_000_000 : null
}

function btcLisible(valeur: number | null): string {
  if (valeur === null) return '—'
  return `${formatNumber(valeur, { maximumFractionDigits: 8 })} BTC`
}

function dollarsLisibles(valeur: number | null): string {
  return formatCurrency(valeur, { decimals: 0, fromAtomic: 1 })
}

/** "2026-07" → "July 2026". An unreadable period is rendered as-is. */
function periodeLisible(periode: string | null | undefined): string {
  if (typeof periode !== 'string' || periode === '') return 'période inconnue'
  const instant = Date.parse(`${periode}-01T00:00:00Z`)
  if (Number.isNaN(instant)) return periode
  return new Date(instant).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function texteBooleen(valeur: boolean | null | undefined, siVrai: string, siFaux: string): string {
  if (valeur === true) return siVrai
  if (valeur === false) return siFaux
  return 'Non communiqué'
}

/**
 * Coverage threshold — the bitcoin price above which a month's production pays
 * for that month's electricity. Two measurements, one division.
 *
 * A zero or missing production does not render "infinity": it renders `null`,
 * and the screen shows "—". An infinite threshold would read as an alert, when
 * it would only mean a missing measurement.
 */
function seuilCouverture(btcDuMois: number | null, factureDollars: number | null): number | null {
  if (btcDuMois === null || factureDollars === null) return null
  if (btcDuMois <= 0) return null
  return factureDollars / btcDuMois
}

/* ── Production series ───────────────────────────────────────────────────── */

function moisProduitsDe(production: Production | null | undefined): MoisProduit[] {
  const bruts = production?.monthly
  if (!Array.isArray(bruts)) return []
  const retenus: MoisProduit[] = []
  for (const mois of bruts) {
    const btc = btcDepuisSats(mois.satsEarned)
    if (btc === null) continue
    retenus.push({ libelle: periodeLisible(mois.period), btc })
  }
  return retenus.sort((a, b) => a.libelle.localeCompare(b.libelle))
}

/**
 * Three distinct silences for one frame.
 *
 * A month actually reported is plotted. A LIVE source with no month is an
 * empty history, which is a fact about the product, not an incident. Anything
 * else is the source's own state, named by `etatSerieDe`.
 */
function etatProduction(bloc: Resolu<Production> | undefined, moisRetenus: number): EtatSerie {
  if (moisRetenus > 0) return { type: 'tracee' }
  const etat = etatSerieDe(bloc, 'La production mensuelle n’est pas encore agrégée par le service.', MOTIFS_MINAGE)
  if (etat.type !== 'tracee') return etat
  return {
    type: 'vide',
    explication:
      'L’historique de production a été interrogé avec succès et ne contient encore aucun mois. Rien n’est tracé plutôt qu’une barre à zéro.',
  }
}

/* ── Screen fragments ───────────────────────────────────────────────────── */

type Ton = 'sain' | 'attention' | 'neutre'

const TON_POINT: Record<Ton, string> = {
  sain: 'bg-success-500',
  attention: 'bg-warning-500',
  neutre: 'bg-zinc-500',
}

function tonBooleen(valeur: boolean | null | undefined, siVrai: Ton, siFaux: Ton): Ton {
  if (valeur === true) return siVrai
  if (valeur === false) return siFaux
  return 'neutre'
}

function LigneEtat({ libelle, valeur, ton }: Readonly<{ libelle: string; valeur: string; ton: Ton }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
      <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">{libelle}</span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2 text-zinc-950 dark:text-white">
        <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-2px] rounded-full', TON_POINT[ton])} />
        <span className="min-w-0">{valeur}</span>
      </span>
    </li>
  )
}

function Attestations({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  if (mouvements.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
        Aucune attestation de minage n’a encore été enregistrée sur la chaîne.
      </p>
    )
  }

  return (
    <ol className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
      {mouvements.map((mouvement) => {
        const montant = montantUsdc(mouvement.assetAmountAtomic)
        return (
          <li
            key={mouvement.id ?? mouvement.txHash ?? mouvement.eventName}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm sm:px-6"
          >
            <span className="min-w-0 text-zinc-950 dark:text-white">
              {libelleMouvement(mouvement.eventName ?? 'Mouvement sans libellé')}
              {montant === '—' ? null : <span className="ml-2 text-zinc-500 tabular-nums dark:text-zinc-400">{montant}</span>}
            </span>
            <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {dateLisible(mouvement.occurredAt)} · {ilYA(mouvement.occurredAt)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Mining summary ──────────────────────────────────────────────────────── */

type ResumeMinage = Readonly<{
  releve: Releve | null | undefined
  electricite: Electricite | null | undefined
  exploitation: Exploitation | null | undefined
  chaine: Chaine | null | undefined
  cumulBtc: number | null
  factureMensuelle: number | null
  totalRegle: number | null
  seuil: number | null
  dernierMois: MoisProduit | undefined
  moisProduits: readonly MoisProduit[]
  attestations: readonly Mouvement[]
  adresseContrat: string | null
}>

function resumeMinage(
  minage: Minage | null,
  production: Resolu<Production> | undefined,
  mouvements: readonly Mouvement[],
): ResumeMinage {
  const releve = minage?.hashrate?.value ?? minage?.btcEarned?.value
  const sats = minage?.btcEarned?.value?.totalBtcEarnedSats ?? releve?.totalBtcEarnedSats
  const electricite = minage?.electricity?.value
  const exploitation = minage?.curtailment?.value ?? minage?.engine?.value
  const chaine = minage?.runtime

  const moisProduits = moisProduitsDe(production?.value)
  const dernierMois = moisProduits.at(-1)

  return {
    releve,
    electricite,
    exploitation,
    chaine,
    cumulBtc: btcDepuisSats(sats),
    factureMensuelle: dollarsDepuisAtomique(electricite?.monthlyCost),
    totalRegle: dollarsDepuisAtomique(electricite?.totalPaid),
    seuil: seuilCouverture(dernierMois?.btc ?? null, dollarsDepuisAtomique(electricite?.monthlyCost)),
    dernierMois,
    moisProduits,
    attestations: mouvements,
    adresseContrat: adresseCourte(chaine?.contractAddress),
  }
}

/* ── Page sections ───────────────────────────────────────────────────────── */

/** Only these movements narrate the mining operation. Everything else lives elsewhere. */
const MOUVEMENTS_MINAGE = new Set([
  'MiningMetricsReported',
  'ElectricityPaid',
  'MonthlyElecCostUpdated',
  'ElecPayeeUpdated',
  'CurtailmentTriggered',
  'CurtailmentLifted',
])

function attestationsMinage(mouvements: readonly Mouvement[]): readonly Mouvement[] {
  return mouvements
    .filter((mouvement) => typeof mouvement.eventName === 'string' && MOUVEMENTS_MINAGE.has(mouvement.eventName))
    .slice(0, 8)
}

function hashrateLisible(releve: Releve | null | undefined): string {
  if (typeof releve?.reportedHashrateTh !== 'string' || releve.reportedHashrateTh === '') return '—'
  return formatNumber(Number(releve.reportedHashrateTh))
}

function prochaineEcheance(electricite: Electricite | null | undefined): string {
  if (typeof electricite?.nextEligiblePayment !== 'string' || electricite.nextEligiblePayment === '') {
    return 'Aucune date d’éligibilité communiquée'
  }
  return dateLisible(electricite.nextEligiblePayment)
}

function modeContrat(chaine: Chaine | null | undefined): string | null {
  if (typeof chaine?.mode !== 'string' || chaine.mode === '') return null
  return ` · mode ${chaine.mode}`
}

function ProductionSection({
  resume,
  production,
}: Readonly<{ resume: ResumeMinage; production: Resolu<Production> | undefined }>) {
  const titreMois = resume.dernierMois === undefined ? 'Mois rapporté' : `Produit en ${resume.dernierMois.libelle}`
  const singleMonth =
    resume.dernierMois !== undefined && !plottableAsChart(resume.moisProduits.length) ? resume.dernierMois : null

  return (
    <AdminSection
      index="01"
      title="Production face à la facture"
      description="L’unique question du minage : le bitcoin produit dans un mois paie-t-il l’électricité de ce mois."
    >
      <AdminGrid>
        <AdminCol span={7}>
          <Panel tone="plain" className="flex h-full flex-col p-6">
            <MetricValue
              valeur={dollarsLisibles(resume.seuil)}
              libelle="Prix du bitcoin qui couvre le mois"
              unite="$ / BTC"
            />
            {/* Three facts, three columns — `AdminMetricGrid` picks a
                column count that leaves no orphan on the last row, which
                a hand-written `grid-cols-2` did not. */}
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle={titreMois} valeur={btcLisible(resume.dernierMois?.btc ?? null)} />
              <SideFact libelle="Facture mensuelle" valeur={dollarsLisibles(resume.factureMensuelle)} />
              <SideFact libelle="Total réglé à ce jour" valeur={dollarsLisibles(resume.totalRegle)} />
            </AdminMetricGrid>
          </Panel>
        </AdminCol>

        {/* The limit of the calculation sits BESIDE the figure, in its own
            column — not as a ruled footnote inside the same panel. A
            threshold without its "we don't know whether it's cleared"
            would read as a profitability verdict. */}
        <AdminCol span={5}>
          <Panel tone="plain" className="flex h-full flex-col p-6">
            <AdminSurfaceTitle>Comment ce seuil est calculé</AdminSurfaceTitle>
            <p className="mt-2 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
              C’est le quotient de deux mesures : le bitcoin attesté par le contrat pour le mois, et la facture
              d’électricité mensuelle. La console s’arrête là — le prix réel du bitcoin n’est publié par aucune
              route du service, elle ne dit donc pas si le seuil est franchi.
            </p>
          </Panel>
        </AdminCol>
      </AdminGrid>

      <ChartFrame
        question="Combien la flotte produit-elle, mois après mois ?"
        unite="en bitcoin, par mois d’exploitation"
        etat={etatProduction(production, resume.moisProduits.length)}
      >
        {singleMonth === null ? (
          <MiningProductionChart mois={resume.moisProduits} />
        ) : (
          <SingleObservation
            valeur={formatNumber(singleMonth.btc, { maximumFractionDigits: 8 })}
            unite="BTC"
            periode={singleMonth.libelle}
            contexte="Bitcoin attesté par le contrat pour ce mois d’exploitation."
            note="Un seul mois de production a été rapporté à ce jour — aucune tendance ne peut encore être mesurée. La série gagne un mois par cycle d’exploitation."
          />
        )}
      </ChartFrame>
    </AdminSection>
  )
}

function FleetSection({ resume }: Readonly<{ resume: ResumeMinage }>) {
  return (
    <AdminSection
      index="02"
      title="La flotte"
      description="Ce que le contrat déclare sur la puissance installée et son régime d’exploitation."
    >
      <AdminGrid>
        <AdminCol span={7}>
          <Panel tone="plain" className="flex h-full flex-col p-6">
            <MetricValue
              valeur={hashrateLisible(resume.releve)}
              libelle="Puissance de calcul rapportée"
              unite="TH/s"
            />
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle="Bitcoin produit depuis l’origine" valeur={btcLisible(resume.cumulBtc)} />
              <SideFact libelle="Dernier relevé" valeur={dateLisible(resume.releve?.lastReportTime)} />
              <SideFact libelle="Ancienneté du relevé" valeur={ilYA(resume.releve?.lastReportTime)} />
            </AdminMetricGrid>
          </Panel>
        </AdminCol>

        <AdminCol span={5}>
          <Panel tone="plain" className="flex h-full flex-col">
            <PanelHeader title="La flotte tourne-t-elle ?" hint="Régime d’exploitation déclaré par le contrat" />
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              <LigneEtat
                libelle="Flotte"
                valeur={texteBooleen(resume.exploitation?.fleetActive, 'En marche', 'Arrêtée')}
                ton={tonBooleen(resume.exploitation?.fleetActive, 'sain', 'attention')}
              />
              <LigneEtat
                libelle="Délestage"
                valeur={texteBooleen(
                  resume.exploitation?.curtailed,
                  'Actif — la production est volontairement réduite',
                  'Inactif',
                )}
                ton={tonBooleen(resume.exploitation?.curtailed, 'attention', 'sain')}
              />
            </ul>
            {resume.adresseContrat === null ? null : (
              <p className="border-t border-zinc-950/5 px-5 py-3 text-xs text-zinc-500 sm:px-6 dark:border-console-line-soft dark:text-zinc-400">
                Déclaré par contrat {resume.adresseContrat}
                {modeContrat(resume.chaine)}
              </p>
            )}
          </Panel>
        </AdminCol>
      </AdminGrid>
    </AdminSection>
  )
}

function ElectricitySection({ resume }: Readonly<{ resume: ResumeMinage }>) {
  return (
    <AdminSection
      index="03"
      title="Électricité"
      description="La ligne de coût du minage : ce qui est dû, ce qui a été payé, et à qui."
    >
      <AdminGrid>
        <AdminCol span={5}>
          <Panel tone="plain" className="flex h-full flex-col">
            <PanelHeader title="Où en est le paiement ?" hint="Ligne d’électricité lue depuis le contrat" />
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              <LigneEtat libelle="Facture du mois" valeur={dollarsLisibles(resume.factureMensuelle)} ton="neutre" />
              <LigneEtat libelle="Total réglé" valeur={dollarsLisibles(resume.totalRegle)} ton="neutre" />
              <LigneEtat libelle="Dernier paiement" valeur={dateLisible(resume.electricite?.lastPayment)} ton="neutre" />
              <LigneEtat
                libelle="Paiement ouvert"
                valeur={texteBooleen(
                  resume.electricite?.canPay,
                  'Oui — un paiement peut être déclenché',
                  'Non — aucun paiement n’est dû actuellement',
                )}
                ton={tonBooleen(resume.electricite?.canPay, 'attention', 'sain')}
              />
              <LigneEtat
                libelle="Prochaine échéance"
                valeur={prochaineEcheance(resume.electricite)}
                ton="neutre"
              />
              <LigneEtat
                libelle="Bénéficiaire"
                valeur={adresseCourte(resume.electricite?.payee) ?? 'Non communiqué'}
                ton="neutre"
              />
            </ul>
          </Panel>
        </AdminCol>

        <AdminCol span={7}>
          <Panel tone="plain" className="flex h-full flex-col">
            <PanelHeader
              title="Ce que le contrat a attesté"
              hint="Relevés de minage et mouvements d’électricité, du plus récent au plus ancien"
            />
            <Attestations mouvements={resume.attestations} />
          </Panel>
        </AdminCol>
      </AdminGrid>
    </AdminSection>
  )
}

function MissingSection({ telemetry }: Readonly<{ telemetry: Resolu<unknown> | undefined }>) {
  return (
    <AdminSection
      index="04"
      title="Ce à quoi le service ne publie aucune réponse"
      description="Les deux vues sont construites et en attente d’une lecture qui n’existe pas en HTTP aujourd’hui. La raison exacte est nommée sous chacune ; le jour où la route apparaît, la série remplace la phrase et la mise en page ne bouge pas."
    >
      <AdminGrid>
        <AdminCol span={6}>
          <ChartFrame
            question="Le minage est-il rentable au prix du marché ?"
            unite="en dollars par térahash par jour"
            etat={{
              type: 'attendue',
              explication:
                'Le service ingère bien ces relevés de marché, et aucune route ne les publie : l’agrégat de minage ne renvoie que la puissance, le bitcoin, l’électricité et l’exploitation. Sans hashprice ni le prix du bitcoin, le seuil ci-dessus reste un seuil.',
            }}
          />
        </AdminCol>
        <AdminCol span={6}>
          <ChartFrame
            question="Comment la flotte se comporte-t-elle au jour le jour ?"
            unite="en térahash par seconde, par relevé"
            etat={etatSerieDe(telemetry, 'La télémétrie d’exploitation n’est pas encore alimentée.', MOTIFS_MINAGE)}
          />
        </AdminCol>
      </AdminGrid>
    </AdminSection>
  )
}

function MiningBody({
  resume,
  production,
  telemetry,
}: Readonly<{
  resume: ResumeMinage
  production: Resolu<Production> | undefined
  telemetry: Resolu<unknown> | undefined
}>) {
  return (
    <>
      <ProductionSection resume={resume} production={production} />
      <FleetSection resume={resume} />
      <ElectricitySection resume={resume} />
      <MissingSection telemetry={telemetry} />
      <AdminSection
        title="Lectures de minage dédiées"
        description="L’agrégat ci-dessus regroupe plusieurs lectures de contrat. Ces routes renvoient chaque ligne isolément."
      >
        <AdminGrid>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="mining-onchain" title="Métriques de minage on-chain" />
          </AdminCol>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="mining-electricity" title="Poste d’électricité" />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const session = await requireSession()
  const user = publicUser(session)

  // Three calls in parallel: the page only renders once all three have
  // arrived — chaining them would only add up their latencies.
  //
  // No `limit` is passed to the events call: `params` only substitutes the
  // registry's path segments, it doesn't build a query string. Passing one
  // would give the illusion of controlled pagination when the service would
  // just apply its own cap. The sorting therefore happens here.
  const [reponseMinage, reponseBtc, reponseMouvements] = await Promise.all([
    callBackend<Minage>('mining'),
    callBackend<Btc>('btc'),
    callBackend<Series1>('series1-events'),
  ])

  const minage = reponseMinage.ok ? reponseMinage.data : null
  const production = reponseBtc.ok ? reponseBtc.data.production : undefined
  const mouvements = reponseMouvements.ok ? (reponseMouvements.data.events?.value ?? []) : []
  const resume = resumeMinage(minage, production, attestationsMinage(mouvements))
  const hashrateValue = hashrateLisible(resume.releve)
  const producedValue = btcLisible(resume.cumulBtc)
  const billValue = dollarsLisibles(resume.factureMensuelle)
  // VER-10: figures are editorial when their source responded; the attestation
  // COUNT is a measurement only when the movements source actually answered —
  // an unread source is a named absence, never a bare "0".
  const miningFigure = (value: string): Availability<string> =>
    reponseMinage.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/mining', status: 'UNAVAILABLE', reason: 'mining_source_unreachable' })
  const btcFigure = (value: string): Availability<string> =>
    reponseBtc.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
  const attestationsCell: Availability<string> = reponseMouvements.ok
    ? available(String(resume.attestations.length), { provenance: 'live', asOf: null })
    : unavailable({ endpoint: '/api/v1/series1/events', status: 'UNAVAILABLE', reason: 'events_source_unreachable' })

  return (
    <ConsoleShell
      label="Poste de pilotage minage Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé minage">
        <Panel tone="plain" className={gcc.metricCard}><h2>Hashrate</h2><div className={gcc.metricText}><Reading value={miningFigure(hashrateValue)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>BTC produit</h2><div className={gcc.metricText}><Reading value={btcFigure(producedValue)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Facture mensuelle</h2><div className={gcc.metricText}><Reading value={miningFigure(billValue)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Attestations</h2><div className={gcc.metricText}><Reading value={attestationsCell} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Seuil de couverture</h2><div className={gcc.metricText}><Reading value={editorial(dollarsLisibles(resume.seuil))} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>État <span>du minage</span></p>
          <p className={gcc.decisionMeta}>{minage === null ? 'Source indisponible' : 'Source disponible'}</p>
          <p className={gcc.decisionActionMuted}>Aucune inférence du prix de marché</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Détails minage">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Opérations de minage</h2></div>
          <div className={gcc.heroBody}>
      {minage === null ? (
        // One card, stated once. Wrapping this single surface in a section
        // would have added a container that carries no information of its own.
        <SourceAttendue
          quoi="L’état du minage n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est supposée."
          requis={['Une réponse du service']}
        />
      ) : (
        <MiningBody resume={resume} production={production} telemetry={minage.operationalTelemetry} />
      )}
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel tone="plain" className={gcc.signalCard}><h3>Flotte</h3><p className={gcc.cellText}>{texteBooleen(resume.exploitation?.fleetActive, 'En marche', 'Arrêtée')}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Délestage</h3><p className={gcc.cellText}>{texteBooleen(resume.exploitation?.curtailed, 'Actif', 'Inactif')}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Bénéficiaire électricité</h3><p className={gcc.cellText}>{adresseCourte(resume.electricite?.payee) ?? 'Non communiqué'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes minage">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Périmètre de calcul</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Seuil = facture mensuelle / BTC produit dans le mois.</p>
            <p className={gcc.cellText}>Aucun verdict de rentabilité sans point d’accès au prix de marché du BTC.</p>
            <p className={gcc.cellText}>Le cadre de télémétrie d’exploitation reste explicite quand elle manque.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Points d’accès</h3><p className={gcc.cellText}>`mining`, `btc`, `series1-events`</p></article>
          <article className={gcc.infoCell}><h3>Production</h3><p className={gcc.cellText}>Rapports mensuels de BTC uniquement.</p></article>
          <article className={gcc.infoCell}><h3>Électricité</h3><p className={gcc.cellText}>Facture et ligne de paiement du contrat.</p></article>
          <article className={gcc.infoCell}><h3>Télémétrie</h3><p className={gcc.cellText}>Non déduite de données sans rapport.</p></article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Lectures dédiées</h3>
          <p className={gcc.cellText}>Les métriques de minage on-chain et les lignes d’électricité restent liées dans les sections de la page.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
