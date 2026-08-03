import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { ProductionMensuelleChart, type MoisProduction } from '@/components/admin/charts/btc-production-chart'
import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminSection } from '@/components/admin/surfaces'
import { ReserveExpositionChart, type PosteBitcoin } from '@/components/admin/product-charts'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { plottableAsChart } from '@/lib/chart-theme'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { LIBELLE_MOUVEMENT, motifLisible } from '@/lib/mouvements'
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import clsx from 'clsx'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = { title: 'Bitcoin' }
export const dynamic = 'force-dynamic'

const manual = (value: string) => ({ kind: 'available' as const, value, provenance: 'manual' as const, asOf: null, stale: false })

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

function HeroFigure({ valeur, libelle, unite }: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className={gcc.metricValue}>{valeur}</p>
      <p className={gcc.cellText}>{libelle}{unite ? ` · ${unite}` : ''}</p>
    </div>
  )
}

function SideFact({ libelle, valeur }: Readonly<{ libelle: string; valeur: string }>) {
  return (
    <div>
      <p className={gcc.cellText}>{libelle}</p>
      <p className={gcc.cellStrong}>{valeur}</p>
    </div>
  )
}

function SourceAttendue({ quoi, detail, requis }: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>{quoi}</h3></div>
      <div className={gcc.heroBody}>
        <p className={gcc.cellText}>{detail}</p>
        {requis.map((item) => <p key={item} className={gcc.cellText}>{item}</p>)}
      </div>
    </Panel>
  )
}

function CalmState({ message }: Readonly<{ message: string }>) {
  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroBody}><p className={gcc.cellText}>{message}</p></div>
    </Panel>
  )
}

/**
 * Bitcoin — what has been produced, at what pace, where the money sleeps,
 * what has happened.
 *
 * The old page dumped a route's response. It answered the question "what
 * does the service return?", which nobody asks. This one asks four: how
 * much bitcoin has the fund produced, at what pace does it produce it, how
 * is its money split between dormant reserve and market exposure, and what
 * deserves to be known among the latest events.
 *
 * ── How the page is composed ───────────────────────────────────────────
 * Four sections on the 12-column grid, under one page title. Every block
 * declares its span, so a column that has no content is deliberate whitespace
 * rather than a stranded card. A section is not a card: it separates with a
 * rule and its H2, and the cards inside it are the only surfaces — the page
 * used to nest everything inside one anonymous section wrapper, which was a
 * box around boxes.
 *
 * ── One month is not a pace ────────────────────────────────────────────
 * Production pace was one of the pending frames: the service only used to
 * transmit a cumulative total. It now exposes a monthly report, and it counts
 * a single month to date. A lone bar inside a full plot area reads as a chart
 * with missing data, so below two ordered observations (`plottableAsChart`)
 * the frame renders the measurement itself — value to the satoshi, period,
 * and a sentence saying no pace is readable yet. The frame stays either way:
 * the question and the unit are owed to the reader.
 *
 * ── What remains empty, and why that's not the same thing ─────────────
 * Three views remain without data, and two very different silences need to
 * be told apart:
 *   — yield attribution and take-profit tiers: the deployed contract
 *     exposes no read for these values (`not_exposed_by_contract`). This
 *     isn't a pending wiring, it's a capability absent from the source; a
 *     new backend deployment wouldn't change that.
 *   — custody of holdings: no custody provider is integrated
 *     (`no_custody_provider_integrated`).
 * And a third silence, different again: the proof registry responds, and
 * it's empty. A table that was queried and is empty is not a missing
 * source — the page states this explicitly, or the two get confused at a
 * glance.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Evenement = {
  readonly name?: string | null
  readonly category?: string | null
  readonly severity?: string | null
  readonly timestamp?: string | null
  readonly occurredAt?: string | null
}

type MoisBrut = {
  readonly period?: string | null
  readonly satsEarned?: string | null
  readonly cumulativeSatsEarned?: string | null
}

type Production = {
  readonly monthly?: readonly MoisBrut[] | null
  readonly cumulativeSatsEarned?: string | null
  readonly cumulativeBtcEarned?: string | null
}

type Btc = {
  readonly reserve?: Resolu<{ balanceUsdc: string | null; balanceBtc: string | null }>
  readonly exposure?: Resolu<{ pouch: string | null; valueUsdc: string | null; targetBps: number | null; actualBps: number | null }>
  readonly btcProduced?: Resolu<{ totalSats: string | null; lastReportTime: string | null }>
  readonly takeProfitTiers?: Resolu<unknown>
  readonly events?: Resolu<readonly Evenement[]>
  readonly attribution?: Resolu<unknown>
  readonly production?: Resolu<Production>
  readonly custody?: Resolu<unknown>
  readonly proofs?: Resolu<readonly unknown[]>
}

const etatDe = etatSerieDe

/**
 * Same amount as a plain number, for CHART SCALE only — never for a
 * displayed figure, which always goes through `formatCurrency`.
 */
function montantNumerique(atomique: string | null | undefined): number | null {
  if (atomique === null || atomique === undefined || atomique === '') return null
  const n = Number(atomique)
  return Number.isFinite(n) ? n / 1_000_000 : null
}

/** A share reads as a percentage, never as raw basis points. */
function partLisible(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

/* ── Satoshis ────────────────────────────────────────────────────────────── */

const ENTIER_DECIMAL = /^\d+$/
const PERIODE_MENSUELLE = /^(\d{4})-(\d{2})$/

/**
 * Satoshis → BTC, to the exact satoshi.
 *
 * The service transmits an integer count of satoshis as a string. Dividing
 * it as floating point would drift the eighth digit — exactly where a
 * bitcoin amount is read. The conversion is therefore done on the string:
 * the integer part and eight decimals come out as-is, with no arithmetic.
 * A string that isn't a decimal integer renders `null`: unreadable is
 * stated, not guessed at.
 */
function btcExactDepuisSats(sats: string | null | undefined): string | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  const rembourre = sats.padStart(9, '0')
  const entiere = Number(rembourre.slice(0, -8))
  return `${entiere.toLocaleString('en-US')}.${rembourre.slice(-8)}`
}

/**
 * The same value as a number, for the chart SCALE only — never for a
 * displayed figure, which always comes from the original string. Total
 * bitcoin issuance caps at 2.1 × 10^15 satoshis, under the 2^53 that
 * `Number` represents exactly: a bar's position stays accurate.
 */
function btcNombreDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  return Number(sats) / 100_000_000
}

/** "2026-07" → "Jul 2026". An unrecognized period is rendered as-is. */
function moisLisible(periode: string): string {
  const parts = PERIODE_MENSUELLE.exec(periode)
  if (parts === null) return periode
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1))
  if (Number.isNaN(date.getTime())) return periode
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Raw reports → usable months. An unreadable month is dropped, not filled in. */
function moisExploitables(production: Production | null | undefined): MoisProduction[] {
  const releves = production?.monthly
  if (!Array.isArray(releves)) return []

  const retenus: MoisProduction[] = []
  for (const brut of releves) {
    const periode = brut?.period
    const btc = btcNombreDepuisSats(brut?.satsEarned)
    const exact = btcExactDepuisSats(brut?.satsEarned)
    if (typeof periode !== 'string' || periode === '' || btc === null || exact === null) continue
    retenus.push({
      periode,
      libelle: moisLisible(periode),
      btc,
      btcExact: exact,
      cumulExact: btcExactDepuisSats(brut?.cumulativeSatsEarned),
    })
  }
  // The service returns months oldest to most recent; this guarantees it
  // rather than assuming it, or the axis would tell time backwards.
  return retenus.sort((a, b) => a.periode.localeCompare(b.periode))
}

/**
 * Three distinct silences, three distinct states.
 *
 * "LIVE but no months" isn't "source missing": in the first case the table
 * responded, in the second nobody answered. Conflating them would announce
 * an outage where there's only an absence of history.
 */
function etatProductionDe(bloc: ChampResolu | undefined, moisRetenus: number): EtatSerie {
  if (moisRetenus > 0) return { type: 'tracee' }
  if (bloc?.status === 'LIVE') {
    return {
      type: 'vide',
      explication:
        'Production reports were successfully queried: no usable month appears yet. The series will appear at the first report.',
    }
  }
  return etatDe(bloc, 'Monthly production reports are not yet transmitted by the service.')
}

function contexteObservationDe(cumulProduction: string | null): string {
  if (cumulProduction === null) {
    return 'Bitcoin attested by the service for this month, to the satoshi.'
  }
  return `Bitcoin attested by the service for this month, to the satoshi. Cumulative since inception: ${cumulProduction} BTC.`
}

/** Severity decides the color AND the word: a colorblind reader gets the same state. */
const GRAVITE: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  critical: { mot: 'Critical', point: 'bg-danger-500', texte: 'text-danger-400' },
  error: { mot: 'Anomaly', point: 'bg-danger-500', texte: 'text-danger-400' },
  warning: { mot: 'Worth watching', point: 'bg-warning-500', texte: 'text-warning-400' },
  warn: { mot: 'Worth watching', point: 'bg-warning-500', texte: 'text-warning-400' },
  // Informational is NEUTRAL, not blue: a fourth hue for "nothing to do about
  // this" made the calm rows compete with the ones that need a decision.
  info: { mot: 'For your information', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
  notice: { mot: 'For your information', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
}

function graviteLisible(brut: string | null | undefined) {
  if (typeof brut !== 'string') return { mot: 'Unclassified', point: 'bg-zinc-600', texte: 'text-zinc-400' }
  return GRAVITE[brut.toLowerCase()] ?? { mot: 'Unclassified', point: 'bg-zinc-600', texte: 'text-zinc-400' }
}

/**
 * A movement's name comes from the shared dictionary — a single source for
 * the whole console, or two screens would end up naming the same event
 * differently.
 *
 * The fallback is worth noting: names arrive from the contract in English
 * PascalCase (`MiningMetricsReported`). Lowercasing them would produce
 * "Miningmetricsreported" — machine-readable only in appearance. A name
 * unknown to the dictionary is therefore split on its capitals, which
 * renders "Take Profit Executed" rather than a jumble.
 */
function nomLisible(brut: string | null | undefined): string {
  if (typeof brut !== 'string' || brut === '') return 'Untitled event'
  const traduit = LIBELLE_MOUVEMENT[brut]
  if (traduit !== undefined) return traduit
  const decoupe = brut
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  return decoupe === '' ? 'Untitled event' : decoupe
}

/* ── Proof registry ──────────────────────────────────────────────────────── */

/**
 * The silence easiest to misread.
 *
 * `proofs` responds LIVE with an empty array. "The table was queried and
 * it's empty" and "no source responds" look alike on screen and have
 * nothing to do with each other: the first is a fact about the product,
 * the second is an incident. The sentence separates them explicitly.
 */
function phrasePreuves(bloc: Resolu<readonly unknown[]>): string {
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    const motif = motifLisible(bloc.reason)
    if (motif === undefined) return 'The proof registry could not be queried.'
    return `The proof registry could not be queried: ${motif}.`
  }
  if (bloc.value.length === 0) {
    return "The registry was queried and is empty: no proof has been published yet. This isn't a missing source — the table responds, it simply has nothing to show for now."
  }
  const nombre = bloc.value.length
  const accord = nombre > 1 ? 'proofs are recorded' : 'proof is recorded'
  return `${nombre} ${accord} in the registry.`
}

/**
 * One sentence deserves a narrow column, not a full-width slab. This card is
 * placed beside the production figures, where it belongs: proofs are about
 * what was produced.
 */
function PreuvesPubliees({ bloc }: Readonly<{ bloc: Resolu<readonly unknown[]> }>) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="What production proofs have been published?"
        hint="Registry of proofs attached to the bitcoin produced"
      />
      <div className="px-5 pb-5 sm:px-6">
        <p className="max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">{phrasePreuves(bloc)}</p>
        {/* No column table is drawn while the registry is empty: the shape
            of a proof has never been observed, and inventing headers would
            amount to publishing a schema nobody has seen. The day a proof
            exists, its fields will be read. */}
      </div>
    </Card>
  )
}

/* ── Event feed ─────────────────────────────────────────────────────────── */

function cleEvenement(e: Evenement, index: number): string {
  return `${e.name ?? 'evenement'}-${e.timestamp ?? e.occurredAt ?? String(index)}`
}

function EvenementRow({ evenement }: Readonly<{ evenement: Evenement }>) {
  const gravite = graviteLisible(evenement.severity)
  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
      <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-1px] rounded-full', gravite.point)} />
      <span className="min-w-0 flex-1 text-zinc-950 dark:text-white">{nomLisible(evenement.name)}</span>
      {evenement.category === null || evenement.category === undefined || evenement.category === '' ? null : (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{nomLisible(evenement.category)}</span>
      )}
      <span className={clsx('text-xs font-medium', gravite.texte)}>{gravite.mot}</span>
      {/* The service also carries an `amount` on some movements. It
          is NOT rendered here: the contract doesn't say what unit
          it's denominated in, and showing "$60,000" on an amount
          that could be in satoshis would be an invention three
          orders of magnitude off. The amount stays available in the
          raw response returned by the service. */}
      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{formatDateTime(evenement.timestamp ?? evenement.occurredAt)}</span>
    </li>
  )
}

/**
 * The event feed carries no title of its own any more: the section it lives
 * in already asks the question in its H2, and repeating it as a card header
 * put a heading inside a panel to say the same thing twice.
 */
function CeQuiSestPasse({ evenements, statutLive }: Readonly<{ evenements: readonly Evenement[]; statutLive: boolean }>) {
  if (evenements.length === 0) {
    return statutLive ? (
      <CalmState message="No bitcoin movement has been recorded. Nothing requires attention." />
    ) : null
  }

  return (
    <Card className="py-1">
      <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        {evenements.map((e, index) => (
          <EvenementRow key={cleEvenement(e, index)} evenement={e} />
        ))}
      </ul>
    </Card>
  )
}

/* ── View model ──────────────────────────────────────────────────────────── */

type VueBitcoin = Readonly<{
  reponse: Btc | null
  bitcoinProduit: string
  reserve: { balanceUsdc: string | null; balanceBtc: string | null } | null | undefined
  exposition: { pouch: string | null; valueUsdc: string | null; targetBps: number | null; actualBps: number | null } | null | undefined
  produit: { totalSats: string | null; lastReportTime: string | null } | null | undefined
  postes: readonly PosteBitcoin[]
  evenements: readonly Evenement[]
  fluxLisible: boolean
  production: Production | null | undefined
  moisProduction: readonly MoisProduction[]
  cumulProduction: string | null
  dernierMois: MoisProduction | undefined
  contexteObservation: string
}>

function buildBitcoinViewModel(reponse: Btc | null): VueBitcoin {
  const b = reponse
  const reserve = b?.reserve?.value
  const exposition = b?.exposure?.value
  const produit = b?.btcProduced?.value

  const sats = produit?.totalSats
  const satsNombre = sats === null || sats === undefined ? null : Number(sats)
  const bitcoinProduit =
    satsNombre === null || !Number.isFinite(satsNombre)
      ? '—'
      : (satsNombre / 100_000_000).toLocaleString('en-US', { maximumFractionDigits: 8 })

  const montantReserve = montantNumerique(reserve?.balanceUsdc)
  const montantExposition = montantNumerique(exposition?.valueUsdc)
  const postes: PosteBitcoin[] = []
  if (montantReserve !== null) postes.push({ poste: 'Reserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposure', montant: montantExposition, accent: true })

  const evenements = b?.events?.value
  const listeEvenements = evenements ?? []
  const fluxLisible = listeEvenements.length > 0 || b?.events?.status === 'LIVE'

  const production = b?.production?.value
  const moisProduction = moisExploitables(production)
  const cumulProduction = btcExactDepuisSats(production?.cumulativeSatsEarned)
  const dernierMois = moisProduction.at(-1)
  const contexteObservation = contexteObservationDe(cumulProduction)

  return {
    reponse: b,
    bitcoinProduit,
    reserve,
    exposition,
    produit,
    postes,
    evenements: listeEvenements,
    fluxLisible,
    production,
    moisProduction,
    cumulProduction,
    dernierMois,
    contexteObservation,
  }
}

function resolveProductionState(b: Btc | null | undefined, moisRetenus: number): EtatSerie {
  return etatProductionDe(b?.production, moisRetenus)
}

function resolveReserveState(postes: readonly PosteBitcoin[]): EtatSerie {
  if (postes.length > 0) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Neither the reserve nor the exposed value could be read on-chain. Nothing is plotted rather than a breakdown at zero.',
  }
}

function resolveMovementState(evenements: readonly Evenement[], fluxLisible: boolean, b: Btc | null): React.ReactNode {
  if (!fluxLisible) return null
  return <CeQuiSestPasse evenements={evenements} statutLive={b?.events?.status === 'LIVE'} />
}

/* ── Sections ───────────────────────────────────────────────────────────── */

function ProductionSection({ vue, b }: Readonly<{ vue: VueBitcoin; b: Btc }>) {
  const proofColumn = b.proofs === undefined ? 12 : 7
  const singleMonth =
    vue.dernierMois !== undefined && !plottableAsChart(vue.moisProduction.length) ? vue.dernierMois : null

  return (
    <AdminSection
      title="What the fund has produced"
      description="Bitcoin attested by the contract since inception, and the pace at which it accumulates."
    >
      <AdminGrid>
        <AdminCol span={proofColumn}>
          <Card className="flex h-full flex-col p-6">
            <HeroFigure valeur={vue.bitcoinProduit} libelle="Bitcoin produced to date" unite="BTC" />
            {/* Three facts, three columns — `AdminMetricGrid` picks a
                column count that leaves no orphan on the last row, which
                a hand-written `grid-cols-2` did not. */}
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle="Dormant reserve" valeur={formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 })} />
              <SideFact libelle="Value exposed to the market" valeur={formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 })} />
              <SideFact libelle="Last production report" valeur={formatDateTime(vue.produit?.lastReportTime)} />
            </AdminMetricGrid>
          </Card>
        </AdminCol>

        {b.proofs === undefined ? null : (
          <AdminCol span={5}>
            <PreuvesPubliees bloc={b.proofs} />
          </AdminCol>
        )}
      </AdminGrid>

      {/* One month is a measurement, not a pace: below two ordered
          observations the frame shows the value itself rather than a
          single bar adrift in a plot area. */}
      <ChartFrame
        question="At what pace is bitcoin being produced?"
        unite="in bitcoin, per reported month"
        etat={resolveProductionState(b, vue.moisProduction.length)}
      >
        {singleMonth === null ? (
          <ProductionMensuelleChart mois={vue.moisProduction} cumulBtc={vue.cumulProduction} />
        ) : (
          <SingleObservation
            valeur={singleMonth.btcExact}
            unite="BTC"
            periode={singleMonth.libelle}
            contexte={vue.contexteObservation}
            note="Only one month has been reported so far. A pace is the gap between two months, and there is no second month yet — the chart appears with the next report."
          />
        )}
      </ChartFrame>
    </AdminSection>
  )
}

function ReserveSection({ vue }: Readonly<{ vue: VueBitcoin }>) {
  const hasExposition = vue.exposition !== null && vue.exposition !== undefined
  const pouch = vue.exposition?.pouch
  const pouchLabel = pouch === null || pouch === undefined || pouch === '' ? 'Not reported' : pouch

  return (
    <AdminSection
      title="Where the money sits"
      description="The same two amounts read as a split: what sleeps in reserve, and what is exposed to the market."
    >
      <AdminGrid>
        <AdminCol span={hasExposition ? 7 : 12}>
          <ChartFrame
            question="Where does the money sit?"
            unite="in dollars"
            etat={resolveReserveState(vue.postes)}
          >
            <ReserveExpositionChart postes={vue.postes} />
          </ChartFrame>
        </AdminCol>

        {hasExposition ? (
          <AdminCol span={5}>
            <Card className="flex h-full flex-col">
              <CardHeader
                title="Does the exposed share respect its target?"
                hint="Comparison between the share targeted by the contract and the one observed on-chain"
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Exposed pouch</span>
                  <span className="min-w-0 flex-1 text-zinc-950 dark:text-white">{pouchLabel}</span>
                </li>
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Target share</span>
                  <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">
                    {partLisible(vue.exposition?.targetBps)}
                  </span>
                </li>
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Observed share</span>
                  <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">
                    {partLisible(vue.exposition?.actualBps)}
                  </span>
                </li>
              </ul>
            </Card>
          </AdminCol>
        ) : null}
      </AdminGrid>
    </AdminSection>
  )
}

function BitcoinBody({ vue, b }: Readonly<{ vue: VueBitcoin; b: Btc }>) {
  return (
    <>
      <ProductionSection vue={vue} b={b} />
      <ReserveSection vue={vue} />

      {/* ── What happened ──────────────────────────────────────────────── */}
      {vue.fluxLisible ? (
        <AdminSection
          title="What happened recently"
          description="Movements and alerts reported by the service, most recent first."
        >
          {resolveMovementState(vue.evenements, vue.fluxLisible, b)}
        </AdminSection>
      ) : null}

      {/* ── What the source doesn't expose ────────────────────────────────
          Without this introduction, "Waiting on the source" would read as
          "coming soon". These three reads aren't coming: they don't exist
          in the deployed contract. Saying it once in the section
          description avoids repeating it under each frame. */}
      <AdminSection
        title="What the source doesn't expose"
        description="These three views are built and ready. They remain without a series not due to an incident, but because the corresponding read doesn't exist in the source: the exact reason is noted under each one. The day the contract exposes it, the series replaces the sentence and the layout doesn't move."
      >
        <AdminGrid>
          <AdminCol span={4}>
            <ChartFrame
              question="Where does the bitcoin yield come from?"
              unite="as a percentage of total"
              etat={etatDe(b.attribution, 'The contract exposes no breakdown of bitcoin yield.')}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="Where is the bitcoin held?"
              unite="in bitcoin, by custody location"
              etat={etatDe(
                b.custody,
                'No custodian is integrated: no custody location has been declared to date.',
              )}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="At what prices are profits taken?"
              unite="in dollars, per tier"
              etat={etatDe(b.takeProfitTiers, 'The contract exposes no take-profit tiers.')}
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
    </>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [session, reponse] = await Promise.all([requireSession(), callBackend<Btc>('btc')])
  const user = publicUser(session)
  const vue = buildBitcoinViewModel(reponse.ok ? reponse.data : null)
  const b = vue.reponse

  return (
    <GreenCommandCenterShell
      label="Hearst Connect bitcoin cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Bitcoin summary">
        <Panel className={gcc.metricCard}><h2>Produced BTC</h2><div className={gcc.metricText}><Reading value={manual(vue.bitcoinProduit)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Reserve</h2><div className={gcc.metricText}><Reading value={manual(formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 }))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Exposure</h2><div className={gcc.metricText}><Reading value={manual(formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 }))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Monthly reports</h2><div className={gcc.metricText}><Reading value={manual(String(vue.moisProduction.length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Event rows</h2><div className={gcc.metricText}><Reading value={manual(String(vue.evenements.length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Bitcoin <span>surface</span></p>
          <p className={gcc.decisionMeta}>{b === null ? 'Source unavailable' : 'Source available'}</p>
          <p className={gcc.decisionActionMuted}>No projected yield</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Bitcoin details">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Bitcoin operations</h2></div>
          <div className={gcc.heroBody}>
      {b === null ? (
        // One card, stated once — no section wrapper around a single surface.
        <SourceAttendue
          quoi="Bitcoin state could not be read"
          detail="The service did not respond. No value is shown rather than a stale one."
          requis={['A response from the service']}
        />
      ) : (
        <BitcoinBody vue={vue} b={b} />
      )}
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Production state</h3><p className={gcc.cellText}>{vue.moisProduction.length > 0 ? 'Reported' : 'Pending'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Reserve split</h3><p className={gcc.cellText}>{vue.postes.length > 0 ? 'Readable' : 'Unavailable'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Events stream</h3><p className={gcc.cellText}>{vue.fluxLisible ? 'Live feed' : 'No feed'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Bitcoin notes">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Guardrails</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>One month is displayed as observation, not trend.</p>
            <p className={gcc.cellText}>No custody chart when provider is not integrated.</p>
            <p className={gcc.cellText}>No take-profit tiers without contract read.</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Endpoint</h3><p className={gcc.cellText}>`btc`</p></article>
          <article className={gcc.infoCell}><h3>Reserve model</h3><p className={gcc.cellText}>Reserve vs exposure in USD.</p></article>
          <article className={gcc.infoCell}><h3>Production model</h3><p className={gcc.cellText}>Satoshis converted with exact decimals.</p></article>
          <article className={gcc.infoCell}><h3>Movement feed</h3><p className={gcc.cellText}>Severity words and dots stay aligned.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Coverage path</h3>
          <p className={gcc.cellText}>Use `/admin/dashboard` for endpoint readiness and reasons.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
