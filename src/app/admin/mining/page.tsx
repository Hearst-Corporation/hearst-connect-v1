import { MiningProductionChart, type MoisProduit } from '@/components/admin/charts/mining-production-chart'
import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { AdminSection } from '@/components/admin/surfaces'
import { PageHeader } from '@/components/admin/page-header'
import { AdminPage } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
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

/* ── Screen fragments ────────────────────────────────────────────────────── */

const TON_POINT: Record<'sain' | 'attention' | 'neutre', string> = {
  sain: 'bg-success-500',
  attention: 'bg-warning-500',
  neutre: 'bg-zinc-500',
}

/**
 * A status line always carries the WORD in plain text. The dot only repeats
 * what the sentence already says: read in black and white, the line stays
 * complete.
 */
function LigneEtat({
  libelle,
  valeur,
  ton,
}: Readonly<{ libelle: string; valeur: string; ton: 'sain' | 'attention' | 'neutre' }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
      <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">{libelle}</span>
      <span className="flex min-w-0 items-baseline gap-2 text-zinc-950 dark:text-white">
        <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-2px] rounded-full', TON_POINT[ton])} />
        {valeur}
      </span>
    </li>
  )
}

/** Timeline of attestations: what the contract actually declared, and when. */
function Attestations({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  if (mouvements.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
        No mining attestation has been recorded on chain yet.
      </p>
    )
  }

  return (
    <ol className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {mouvements.map((mouvement, rang) => {
        const montant = montantUsdc(mouvement.assetAmountAtomic)
        return (
          <li
            key={mouvement.id ?? mouvement.txHash ?? `attestation-${rang}`}
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

/* ── Page ────────────────────────────────────────────────────────────────── */

/** Only these movements narrate the mining operation. Everything else lives elsewhere. */
const MOUVEMENTS_MINAGE = new Set([
  'MiningMetricsReported',
  'ElectricityPaid',
  'MonthlyElecCostUpdated',
  'ElecPayeeUpdated',
  'CurtailmentTriggered',
  'CurtailmentLifted',
])

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

  const releve = minage?.hashrate?.value
  const sats = minage?.btcEarned?.value?.totalBtcEarnedSats ?? releve?.totalBtcEarnedSats
  const electricite = minage?.electricity?.value
  const exploitation = minage?.curtailment?.value ?? minage?.engine?.value
  const chaine = minage?.runtime

  const cumulBtc = btcDepuisSats(sats)
  const factureMensuelle = dollarsDepuisAtomique(electricite?.monthlyCost)
  const totalRegle = dollarsDepuisAtomique(electricite?.totalPaid)

  // Production series: the backend aggregates it by month, the page only
  // converts and formats it. No month is backfilled or interpolated — a gap
  // in the series is a gap in the readings, it must show.
  const moisBruts = production?.value?.monthly ?? []
  const moisProduits: MoisProduit[] = moisBruts.flatMap((mois) => {
    const btc = btcDepuisSats(mois.satsEarned)
    if (btc === null) return []
    return [{ libelle: periodeLisible(mois.period), btc }]
  })
  const dernierMois = moisProduits.at(-1)
  const seuil = seuilCouverture(dernierMois?.btc ?? null, factureMensuelle)

  const mouvements = reponseMouvements.ok ? (reponseMouvements.data.events?.value ?? []) : []
  const attestations = mouvements
    .filter((mouvement) => typeof mouvement.eventName === 'string' && MOUVEMENTS_MINAGE.has(mouvement.eventName))
    .slice(0, 8)

  const adresseContrat = adresseCourte(chaine?.contractAddress)

  return (
    <AdminPage>
      <PageHeader
        title="Mining"
        description="Does what the fleet produces cover what it consumes?"
      />

      {minage === null ? (
        <AdminSection>
          <SourceAttendue
            quoi="Mining status could not be read"
            detail="The service did not respond. No value is assumed."
            requis={['A response from the service']}
          />
        </AdminSection>
      ) : (
        <>
          {/* ── 01 · The economic equation ───────────────────────────────────── */}
          <AdminSection
            index="01"
            title="Production against bill"
            description="Mining's only question: does the bitcoin produced in a month pay for that month's electricity."
          >
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={dollarsLisibles(seuil)}
                  libelle="Bitcoin price that covers the month"
                  unite="$ / BTC"
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <SideFact
                    libelle={dernierMois === undefined ? 'Month reported' : `Produced in ${dernierMois.libelle}`}
                    valeur={btcLisible(dernierMois?.btc ?? null)}
                  />
                  <SideFact libelle="Monthly bill" valeur={dollarsLisibles(factureMensuelle)} />
                  <SideFact libelle="Total paid to date" valeur={dollarsLisibles(totalRegle)} />
                </dl>
              </div>
              {/* The limit of the calculation is written next to the figure, not
                  as a footnote: a threshold without its "we don't know whether
                  it's cleared" would read as a profitability verdict. */}
              <p className="mt-6 max-w-2xl border-t border-zinc-950/5 pt-4 text-sm text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                This threshold is the quotient of two measurements: the bitcoin attested by the contract for the
                month, and the monthly electricity bill. The console stops there — the actual bitcoin price is not
                published by any route of the service, so it does not say whether the threshold is cleared.
              </p>
            </Card>

            <ChartFrame
              question="How much does the fleet produce, month after month?"
              unite="in bitcoin, per month of operation"
              etat={etatSerieDe(
                production,
                'Monthly production is not yet aggregated by the service.',
                MOTIFS_MINAGE,
              )}
            >
              <MiningProductionChart mois={moisProduits} />
              {moisProduits.length === 1 ? (
                <p className="border-t border-zinc-950/5 px-6 py-3 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                  Only one month is reported to date: the single bar is the exact extent of the history, not a
                  display defect. The series will grow by one month each cycle.
                </p>
              ) : null}
            </ChartFrame>

            <ChartFrame
              question="Is mining profitable at the market price?"
              unite="in dollars per terahash per day"
              etat={{
                type: 'attendue',
                explication:
                  'The service does ingest these market readings, and no route publishes them: the mining aggregate returns only power, bitcoin, electricity, and operation. Without hashprice or the bitcoin price, the threshold above remains a threshold.',
              }}
              hauteur="h-44"
            />
          </AdminSection>

          {/* ── 02 · The fleet ────────────────────────────────────────────────── */}
          <AdminSection
            index="02"
            title="The fleet"
            description="What the contract declares about installed power and its operating regime."
          >
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={
                    typeof releve?.reportedHashrateTh === 'string' && releve.reportedHashrateTh !== ''
                      ? formatNumber(Number(releve.reportedHashrateTh))
                      : '—'
                  }
                  libelle="Reported compute power"
                  unite="TH/s"
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <SideFact libelle="Bitcoin produced since inception" valeur={btcLisible(cumulBtc)} />
                  <SideFact libelle="Last reading" valeur={dateLisible(releve?.lastReportTime)} />
                  <SideFact libelle="Reading age" valeur={ilYA(releve?.lastReportTime)} />
                </dl>
              </div>
            </Card>

            <Card>
              <CardHeader title="Is the fleet running?" hint="Operating regime declared by the contract" />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <LigneEtat
                  libelle="Fleet"
                  valeur={texteBooleen(exploitation?.fleetActive, 'Running', 'Stopped')}
                  ton={exploitation?.fleetActive === true ? 'sain' : 'attention'}
                />
                <LigneEtat
                  libelle="Curtailment"
                  valeur={texteBooleen(
                    exploitation?.curtailed,
                    'Active — production is voluntarily reduced',
                    'Inactive',
                  )}
                  ton={exploitation?.curtailed === true ? 'attention' : 'sain'}
                />
              </ul>
              {adresseContrat === null ? null : (
                <p className="border-t border-zinc-950/5 px-5 py-3 text-xs text-zinc-500 sm:px-6 dark:border-white/5 dark:text-zinc-400">
                  Declared by contract {adresseContrat}
                  {typeof chaine?.mode === 'string' && chaine.mode !== '' ? ` · mode ${chaine.mode}` : null}
                </p>
              )}
            </Card>

            <ChartFrame
              question="How does the fleet behave day to day?"
              unite="in terahash per second, per reading"
              etat={etatSerieDe(
                minage.operationalTelemetry,
                'Operational telemetry is not yet fed.',
                MOTIFS_MINAGE,
              )}
              hauteur="h-44"
            />
          </AdminSection>

          {/* ── 03 · Electricity ──────────────────────────────────────────────── */}
          <AdminSection
            index="03"
            title="Electricity"
            description="Mining's cost line: what's owed, what's been paid, and to whom."
          >
            <Card>
              <CardHeader title="Where does the payment stand?" hint="Electricity line read from the contract" />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <LigneEtat libelle="Bill for the month" valeur={dollarsLisibles(factureMensuelle)} ton="neutre" />
                <LigneEtat libelle="Total paid" valeur={dollarsLisibles(totalRegle)} ton="neutre" />
                <LigneEtat libelle="Last payment" valeur={dateLisible(electricite?.lastPayment)} ton="neutre" />
                <LigneEtat
                  libelle="Payment open"
                  valeur={texteBooleen(
                    electricite?.canPay,
                    'Yes — a payment can be triggered',
                    'No — no payment is due right now',
                  )}
                  ton={electricite?.canPay === true ? 'attention' : 'sain'}
                />
                <LigneEtat
                  libelle="Next due date"
                  valeur={
                    typeof electricite?.nextEligiblePayment === 'string' && electricite.nextEligiblePayment !== ''
                      ? dateLisible(electricite.nextEligiblePayment)
                      : 'No eligibility date disclosed'
                  }
                  ton="neutre"
                />
                <LigneEtat
                  libelle="Payee"
                  valeur={adresseCourte(electricite?.payee) ?? 'Not disclosed'}
                  ton="neutre"
                />
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="What the contract has attested"
                hint="Mining readings and electricity movements, most recent first"
              />
              <Attestations mouvements={attestations} />
            </Card>
          </AdminSection>
        </>
      )}
    </AdminPage>
  )
}
