import { MiningProductionChart, type MoisProduit } from '@/components/admin/charts/mining-production-chart'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminSection } from '@/components/admin/surfaces'
import { PageHeader } from '@/components/admin/page-header'
import { AdminPage, AdminSurfaceTitle } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { plottableAsChart } from '@/lib/chart-theme'
import { adresseCourte, dateLisible, ilYA, libelleMouvement, montantUsdc } from '@/lib/mouvements'
import { formatCurrency, formatNumber } from '@/lib/format'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
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
  no_telemetry_rows: 'the telemetry table is wired up, and no reading has been recorded there yet',
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
  if (typeof periode !== 'string' || periode === '') return 'unknown period'
  const instant = Date.parse(`${periode}-01T00:00:00Z`)
  if (Number.isNaN(instant)) return periode
  return new Date(instant).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function texteBooleen(valeur: boolean | null | undefined, siVrai: string, siFaux: string): string {
  if (valeur === true) return siVrai
  if (valeur === false) return siFaux
  return 'Not disclosed'
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
  const etat = etatSerieDe(bloc, 'Monthly production is not yet aggregated by the service.', MOTIFS_MINAGE)
  if (etat.type !== 'tracee') return etat
  return {
    type: 'vide',
    explication:
      'The production history was queried successfully and holds no month yet. Nothing is plotted rather than a bar at zero.',
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
        No mining attestation has been recorded on chain yet.
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
              {libelleMouvement(mouvement.eventName ?? 'Unlabeled movement')}
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
    return 'No eligibility date disclosed'
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
  const titreMois = resume.dernierMois === undefined ? 'Month reported' : `Produced in ${resume.dernierMois.libelle}`
  const singleMonth =
    resume.dernierMois !== undefined && !plottableAsChart(resume.moisProduits.length) ? resume.dernierMois : null

  return (
    <AdminSection
      index="01"
      title="Production against bill"
      description="Mining's only question: does the bitcoin produced in a month pay for that month's electricity."
    >
      <AdminGrid>
        <AdminCol span={7}>
          <Card className="flex h-full flex-col p-6">
            <HeroFigure
              valeur={dollarsLisibles(resume.seuil)}
              libelle="Bitcoin price that covers the month"
              unite="$ / BTC"
            />
            {/* Three facts, three columns — `AdminMetricGrid` picks a
                column count that leaves no orphan on the last row, which
                a hand-written `grid-cols-2` did not. */}
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle={titreMois} valeur={btcLisible(resume.dernierMois?.btc ?? null)} />
              <SideFact libelle="Monthly bill" valeur={dollarsLisibles(resume.factureMensuelle)} />
              <SideFact libelle="Total paid to date" valeur={dollarsLisibles(resume.totalRegle)} />
            </AdminMetricGrid>
          </Card>
        </AdminCol>

        {/* The limit of the calculation sits BESIDE the figure, in its own
            column — not as a ruled footnote inside the same panel. A
            threshold without its "we don't know whether it's cleared"
            would read as a profitability verdict. */}
        <AdminCol span={5}>
          <Card className="flex h-full flex-col p-6">
            <AdminSurfaceTitle>How this threshold is computed</AdminSurfaceTitle>
            <p className="mt-2 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
              It is the quotient of two measurements: the bitcoin attested by the contract for the month, and the
              monthly electricity bill. The console stops there — the actual bitcoin price is not published by any
              route of the service, so it does not say whether the threshold is cleared.
            </p>
          </Card>
        </AdminCol>
      </AdminGrid>

      <ChartFrame
        question="How much does the fleet produce, month after month?"
        unite="in bitcoin, per month of operation"
        etat={etatProduction(production, resume.moisProduits.length)}
      >
        {singleMonth === null ? (
          <MiningProductionChart mois={resume.moisProduits} />
        ) : (
          <SingleObservation
            valeur={formatNumber(singleMonth.btc, { maximumFractionDigits: 8 })}
            unite="BTC"
            periode={singleMonth.libelle}
            contexte="Bitcoin attested by the contract for this month of operation."
            note="One month of production has been reported so far — no trend can be measured yet. The series gains one month per operating cycle."
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
      title="The fleet"
      description="What the contract declares about installed power and its operating regime."
    >
      <AdminGrid>
        <AdminCol span={7}>
          <Card className="flex h-full flex-col p-6">
            <HeroFigure
              valeur={hashrateLisible(resume.releve)}
              libelle="Reported compute power"
              unite="TH/s"
            />
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle="Bitcoin produced since inception" valeur={btcLisible(resume.cumulBtc)} />
              <SideFact libelle="Last reading" valeur={dateLisible(resume.releve?.lastReportTime)} />
              <SideFact libelle="Reading age" valeur={ilYA(resume.releve?.lastReportTime)} />
            </AdminMetricGrid>
          </Card>
        </AdminCol>

        <AdminCol span={5}>
          <Card className="flex h-full flex-col">
            <CardHeader title="Is the fleet running?" hint="Operating regime declared by the contract" />
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              <LigneEtat
                libelle="Fleet"
                valeur={texteBooleen(resume.exploitation?.fleetActive, 'Running', 'Stopped')}
                ton={tonBooleen(resume.exploitation?.fleetActive, 'sain', 'attention')}
              />
              <LigneEtat
                libelle="Curtailment"
                valeur={texteBooleen(
                  resume.exploitation?.curtailed,
                  'Active — production is voluntarily reduced',
                  'Inactive',
                )}
                ton={tonBooleen(resume.exploitation?.curtailed, 'attention', 'sain')}
              />
            </ul>
            {resume.adresseContrat === null ? null : (
              <p className="border-t border-zinc-950/5 px-5 py-3 text-xs text-zinc-500 sm:px-6 dark:border-console-line-soft dark:text-zinc-400">
                Declared by contract {resume.adresseContrat}
                {modeContrat(resume.chaine)}
              </p>
            )}
          </Card>
        </AdminCol>
      </AdminGrid>
    </AdminSection>
  )
}

function ElectricitySection({ resume }: Readonly<{ resume: ResumeMinage }>) {
  return (
    <AdminSection
      index="03"
      title="Electricity"
      description="Mining's cost line: what's owed, what's been paid, and to whom."
    >
      <AdminGrid>
        <AdminCol span={5}>
          <Card className="flex h-full flex-col">
            <CardHeader title="Where does the payment stand?" hint="Electricity line read from the contract" />
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              <LigneEtat libelle="Bill for the month" valeur={dollarsLisibles(resume.factureMensuelle)} ton="neutre" />
              <LigneEtat libelle="Total paid" valeur={dollarsLisibles(resume.totalRegle)} ton="neutre" />
              <LigneEtat libelle="Last payment" valeur={dateLisible(resume.electricite?.lastPayment)} ton="neutre" />
              <LigneEtat
                libelle="Payment open"
                valeur={texteBooleen(
                  resume.electricite?.canPay,
                  'Yes — a payment can be triggered',
                  'No — no payment is due right now',
                )}
                ton={tonBooleen(resume.electricite?.canPay, 'attention', 'sain')}
              />
              <LigneEtat
                libelle="Next due date"
                valeur={prochaineEcheance(resume.electricite)}
                ton="neutre"
              />
              <LigneEtat
                libelle="Payee"
                valeur={adresseCourte(resume.electricite?.payee) ?? 'Not disclosed'}
                ton="neutre"
              />
            </ul>
          </Card>
        </AdminCol>

        <AdminCol span={7}>
          <Card className="flex h-full flex-col">
            <CardHeader
              title="What the contract has attested"
              hint="Mining readings and electricity movements, most recent first"
            />
            <Attestations mouvements={resume.attestations} />
          </Card>
        </AdminCol>
      </AdminGrid>
    </AdminSection>
  )
}

function MissingSection({ telemetry }: Readonly<{ telemetry: Resolu<unknown> | undefined }>) {
  return (
    <AdminSection
      index="04"
      title="What the service publishes no answer for"
      description="Both views are built and waiting on a read that does not exist over HTTP today. The exact reason is named under each one; the day the route appears, the series replaces the sentence and the layout does not move."
    >
      <AdminGrid>
        <AdminCol span={6}>
          <ChartFrame
            question="Is mining profitable at the market price?"
            unite="in dollars per terahash per day"
            etat={{
              type: 'attendue',
              explication:
                'The service does ingest these market readings, and no route publishes them: the mining aggregate returns only power, bitcoin, electricity, and operation. Without hashprice or the bitcoin price, the threshold above remains a threshold.',
            }}
          />
        </AdminCol>
        <AdminCol span={6}>
          <ChartFrame
            question="How does the fleet behave day to day?"
            unite="in terahash per second, per reading"
            etat={etatSerieDe(telemetry, 'Operational telemetry is not yet fed.', MOTIFS_MINAGE)}
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
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
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

  return (
    <AdminPage>
      <PageHeader title="Mining" description="Does what the fleet produces cover what it consumes?" />

      {minage === null ? (
        // One card, stated once. Wrapping this single surface in a section
        // would have added a container that carries no information of its own.
        <SourceAttendue
          quoi="Mining status could not be read"
          detail="The service did not respond. No value is assumed."
          requis={['A response from the service']}
        />
      ) : (
        <MiningBody resume={resume} production={production} telemetry={minage.operationalTelemetry} />
      )}
    </AdminPage>
  )
}
