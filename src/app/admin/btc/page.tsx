import { ChartFrame, ProductionMensuelleChart, ReserveExpositionChart, plottableAsChart, type EtatSerie, type MoisProduction, type PosteBitcoin } from '@/components/charts'
import { CalmState, MetricValue, Panel, PanelHeader, SideFact, SourceAttendue } from '@/components/compositions'
import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminSection } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { available, editorial, unavailable } from '@/lib/vaults/model'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { LIBELLE_MOUVEMENT, motifLisible } from '@/lib/mouvements'
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import clsx from 'clsx'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = { title: 'Bitcoin' }
export const dynamic = 'force-dynamic'

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
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
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
        'Les rapports de production ont bien été interrogés : aucun mois exploitable n’apparaît encore. La série apparaîtra au premier rapport.',
    }
  }
  return etatDe(bloc, 'Les rapports de production mensuels ne sont pas encore transmis par le service.')
}

function contexteObservationDe(cumulProduction: string | null): string {
  if (cumulProduction === null) {
    return 'Bitcoin attesté par le service pour ce mois, au satoshi près.'
  }
  return `Bitcoin attesté par le service pour ce mois, au satoshi près. Cumul depuis l’origine : ${cumulProduction} BTC.`
}

/** Severity decides the color AND the word: a colorblind reader gets the same state. */
const GRAVITE: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  critical: { mot: 'Critique', point: 'bg-danger-500', texte: 'text-danger-400' },
  error: { mot: 'Anomalie', point: 'bg-danger-500', texte: 'text-danger-400' },
  warning: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400' },
  warn: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400' },
  // Informational is NEUTRAL, not blue: a fourth hue for "nothing to do about
  // this" made the calm rows compete with the ones that need a decision.
  info: { mot: 'Pour information', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
  notice: { mot: 'Pour information', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
}

function graviteLisible(brut: string | null | undefined) {
  if (typeof brut !== 'string') return { mot: 'Non classé', point: 'bg-zinc-600', texte: 'text-zinc-400' }
  return GRAVITE[brut.toLowerCase()] ?? { mot: 'Non classé', point: 'bg-zinc-600', texte: 'text-zinc-400' }
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
  if (typeof brut !== 'string' || brut === '') return 'Événement sans titre'
  const traduit = LIBELLE_MOUVEMENT[brut]
  if (traduit !== undefined) return traduit
  const decoupe = brut
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  return decoupe === '' ? 'Événement sans titre' : decoupe
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
    if (motif === undefined) return 'Le registre des preuves n’a pas pu être interrogé.'
    return `Le registre des preuves n’a pas pu être interrogé : ${motif}.`
  }
  if (bloc.value.length === 0) {
    return 'Le registre a été interrogé et il est vide : aucune preuve n’a encore été publiée. Ce n’est pas une source manquante — la table répond, elle n’a simplement rien à montrer pour l’instant.'
  }
  const nombre = bloc.value.length
  const accord = nombre > 1 ? 'preuves enregistrées' : 'preuve enregistrée'
  return `${nombre} ${accord} dans le registre.`
}

/**
 * One sentence deserves a narrow column, not a full-width slab. This card is
 * placed beside the production figures, where it belongs: proofs are about
 * what was produced.
 */
function PreuvesPubliees({ bloc }: Readonly<{ bloc: Resolu<readonly unknown[]> }>) {
  return (
    <Panel tone="plain" className="flex h-full flex-col">
      <PanelHeader
        title="Quelles preuves de production ont été publiées ?"
        hint="Registre des preuves attachées au bitcoin produit"
      />
      <div className="px-5 pb-5 sm:px-6">
        <p className="max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">{phrasePreuves(bloc)}</p>
        {/* No column table is drawn while the registry is empty: the shape
            of a proof has never been observed, and inventing headers would
            amount to publishing a schema nobody has seen. The day a proof
            exists, its fields will be read. */}
      </div>
    </Panel>
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
      <CalmState message="Aucun mouvement bitcoin n’a été enregistré. Rien ne requiert d’attention." />
    ) : null
  }

  return (
    <Panel tone="plain" className="py-1">
      <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        {evenements.map((e, index) => (
          <EvenementRow key={cleEvenement(e, index)} evenement={e} />
        ))}
      </ul>
    </Panel>
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

  /*
   * Rendu inchangé (`formatNumber` applique le même `toLocaleString('en-US')`
   * et le même repli « — » que le code local qu'il remplace).
   *
   * NB : ce site utilise la division flottante, alors que le reste du fichier
   * convertit les satoshis sur la CHAÎNE (`btcExactDepuisSats`) pour ne pas
   * dériver au 8e chiffre. Les deux ne diffèrent pas sur les valeurs observées,
   * mais l'affichage n'est pas le même (`1` ici, `1.00000000` là) : basculer
   * change ce que l'écran montre, ce qui relève d'un arbitrage produit et non
   * d'une passe de propreté. Signalé, non tranché ici.
   */
  const satsNombre = btcNombreDepuisSats(produit?.totalSats)
  const bitcoinProduit = formatNumber(satsNombre, { maximumFractionDigits: 8 })

  const montantReserve = montantNumerique(reserve?.balanceUsdc)
  const montantExposition = montantNumerique(exposition?.valueUsdc)
  const postes: PosteBitcoin[] = []
  if (montantReserve !== null) postes.push({ poste: 'Réserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposition', montant: montantExposition, accent: true })

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
      'Ni la réserve ni la valeur exposée n’ont pu être lues on-chain. Rien n’est tracé plutôt qu’une répartition à zéro.',
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
      title="Ce que le fonds a produit"
      description="Bitcoin attesté par le contrat depuis l’origine, et le rythme auquel il s’accumule."
    >
      <AdminGrid>
        <AdminCol span={proofColumn}>
          <Panel tone="plain" className="flex h-full flex-col p-6">
            <MetricValue valeur={vue.bitcoinProduit} libelle="Bitcoin produit à ce jour" unite="BTC" />
            {/* Three facts, three columns — `AdminMetricGrid` picks a
                column count that leaves no orphan on the last row, which
                a hand-written `grid-cols-2` did not. */}
            <AdminMetricGrid count={3} className="mt-6">
              <SideFact libelle="Réserve dormante" valeur={formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 })} />
              <SideFact libelle="Valeur exposée au marché" valeur={formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 })} />
              <SideFact libelle="Dernier rapport de production" valeur={formatDateTime(vue.produit?.lastReportTime)} />
            </AdminMetricGrid>
          </Panel>
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
        question="À quel rythme le bitcoin est-il produit ?"
        unite="en bitcoin, par mois rapporté"
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
            note="Un seul mois a été rapporté à ce jour. Un rythme est l’écart entre deux mois, et il n’y a pas encore de deuxième mois — le graphique apparaîtra au prochain rapport."
          />
        )}
      </ChartFrame>
    </AdminSection>
  )
}

function ReserveSection({ vue }: Readonly<{ vue: VueBitcoin }>) {
  const hasExposition = vue.exposition !== null && vue.exposition !== undefined
  const pouch = vue.exposition?.pouch
  const pouchLabel = pouch === null || pouch === undefined || pouch === '' ? 'Non renseigné' : pouch

  return (
    <AdminSection
      title="Où se trouve l’argent"
      description="Les deux mêmes montants lus comme une répartition : ce qui dort en réserve, et ce qui est exposé au marché."
    >
      <AdminGrid>
        <AdminCol span={hasExposition ? 7 : 12}>
          <ChartFrame
            question="Où se trouve l’argent ?"
            unite="en dollars"
            etat={resolveReserveState(vue.postes)}
          >
            <ReserveExpositionChart postes={vue.postes} />
          </ChartFrame>
        </AdminCol>

        {hasExposition ? (
          <AdminCol span={5}>
            <Panel tone="plain" className="flex h-full flex-col">
              <PanelHeader
                title="La part exposée respecte-t-elle sa cible ?"
                hint="Comparaison entre la part visée par le contrat et celle observée on-chain"
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Poche exposée</span>
                  <span className="min-w-0 flex-1 text-zinc-950 dark:text-white">{pouchLabel}</span>
                </li>
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Part cible</span>
                  <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">
                    {partLisible(vue.exposition?.targetBps)}
                  </span>
                </li>
                <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                  <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Part observée</span>
                  <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">
                    {partLisible(vue.exposition?.actualBps)}
                  </span>
                </li>
              </ul>
            </Panel>
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
          title="Ce qui s’est passé récemment"
          description="Mouvements et alertes rapportés par le service, du plus récent au plus ancien."
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
        title="Ce que la source n’expose pas"
        description="Ces trois vues sont construites et prêtes. Elles restent sans série non pas à cause d’un incident, mais parce que la lecture correspondante n’existe pas dans la source : la raison exacte est notée sous chacune. Le jour où le contrat l’expose, la série remplace la phrase et la mise en page ne bouge pas."
      >
        <AdminGrid>
          <AdminCol span={4}>
            <ChartFrame
              question="D’où provient le rendement bitcoin ?"
              unite="en pourcentage du total"
              etat={etatDe(b.attribution, 'Le contrat n’expose aucune ventilation du rendement bitcoin.')}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="Où le bitcoin est-il conservé ?"
              unite="en bitcoin, par lieu de conservation"
              etat={etatDe(
                b.custody,
                'Aucun conservateur n’est intégré : aucun lieu de conservation n’a été déclaré à ce jour.',
              )}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="À quels prix les profits sont-ils pris ?"
              unite="en dollars, par palier"
              etat={etatDe(b.takeProfitTiers, 'Le contrat n’expose aucun palier de prise de profit.')}
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

  // VER-10: figures are editorial when the source responded, absent otherwise —
  // never badged "Live" for a placeholder. Counts (Monthly reports, Event rows)
  // are measurements only when their source actually answered.
  const btcFigure = (value: string) =>
    reponse.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
  const monthlyReportsCell = reponse.ok
    ? available(String(vue.moisProduction.length), { provenance: 'live', asOf: null })
    : unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
  const eventRowsCell =
    reponse.ok && b?.events?.value
      ? available(String(vue.evenements.length), { provenance: 'live', asOf: null })
      : unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'events_unreadable' })

  return (
    <ConsoleShell
      label="Poste de pilotage bitcoin Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé bitcoin">
        <Panel tone="plain" className={gcc.metricCard}><h2>BTC produit</h2><div className={gcc.metricText}><Reading value={btcFigure(vue.bitcoinProduit)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Réserve</h2><div className={gcc.metricText}><Reading value={btcFigure(formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 }))} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Exposition</h2><div className={gcc.metricText}><Reading value={btcFigure(formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 }))} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Rapports mensuels</h2><div className={gcc.metricText}><Reading value={monthlyReportsCell} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Lignes d’événement</h2><div className={gcc.metricText}><Reading value={eventRowsCell} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Surface <span>bitcoin</span></p>
          <p className={gcc.decisionMeta}>{b === null ? 'Source indisponible' : 'Source disponible'}</p>
          <p className={gcc.decisionActionMuted}>Aucun rendement projeté</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Détails bitcoin">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Opérations bitcoin</h2></div>
          <div className={gcc.heroBody}>
      {b === null ? (
        // One card, stated once — no section wrapper around a single surface.
        <SourceAttendue
          quoi="L’état bitcoin n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur obsolète."
          requis={['Une réponse du service']}
        />
      ) : (
        <BitcoinBody vue={vue} b={b} />
      )}
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel tone="plain" className={gcc.signalCard}><h3>État de la production</h3><p className={gcc.cellText}>{vue.moisProduction.length > 0 ? 'Rapporté' : 'En attente'}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Répartition de la réserve</h3><p className={gcc.cellText}>{vue.postes.length > 0 ? 'Lisible' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Flux d’événements</h3><p className={gcc.cellText}>{vue.fluxLisible ? 'Flux en direct' : 'Aucun flux'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes bitcoin">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Garde-fous</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Un mois est affiché comme observation, pas comme tendance.</p>
            <p className={gcc.cellText}>Aucun graphique de conservation quand le prestataire n’est pas intégré.</p>
            <p className={gcc.cellText}>Aucun palier de prise de profit sans lecture du contrat.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Point d’accès</h3><p className={gcc.cellText}>`btc`</p></article>
          <article className={gcc.infoCell}><h3>Modèle de réserve</h3><p className={gcc.cellText}>Réserve contre exposition en USD.</p></article>
          <article className={gcc.infoCell}><h3>Modèle de production</h3><p className={gcc.cellText}>Satoshis convertis avec décimales exactes.</p></article>
          <article className={gcc.infoCell}><h3>Flux de mouvements</h3><p className={gcc.cellText}>Les mots de gravité et les pastilles restent alignés.</p></article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Chemin de couverture</h3>
          <p className={gcc.cellText}>Utilisez `/admin/dashboard` pour l’état de préparation des points d’accès et les raisons.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
