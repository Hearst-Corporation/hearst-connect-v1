import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { ProductionMensuelleChart, type MoisProduction } from '@/components/admin/charts/btc-production-chart'
import { CalmState, Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { ReserveExpositionChart, type PosteBitcoin } from '@/components/admin/product-charts'
import { AdminCaption, AdminSectionTitle } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { LIBELLE_MOUVEMENT, motifLisible } from '@/lib/mouvements'
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import clsx from 'clsx'
import type { Metadata } from 'next'

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
 * ── What changed, and why ──────────────────────────────────────────────
 * Production pace was one of the pending frames: the service only used to
 * transmit a cumulative total. It now exposes a monthly report, so the
 * series is plotted. It counts only one month to date: the page SAYS so,
 * instead of letting a single isolated bar pass for a trend.
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

/**
 * The real shape of a `/api/v1/btc` event, as observed on the service.
 *
 * The timestamp arrives under `timestamp`, not `occurredAt` — the previous
 * version read the wrong field and therefore showed "—" on every row. Both
 * names are accepted here: the second costs nothing and covers a
 * divergence between routes.
 */
type Evenement = {
  readonly name?: string | null
  readonly category?: string | null
  readonly severity?: string | null
  readonly timestamp?: string | null
  readonly occurredAt?: string | null
}

/** Monthly production report, in whole satoshis transmitted as a string. */
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

/** Severity decides the color AND the word: a colorblind reader gets the same state. */
const GRAVITE: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  critical: { mot: 'Critical', point: 'bg-danger-500', texte: 'text-danger-400' },
  error: { mot: 'Anomaly', point: 'bg-danger-500', texte: 'text-danger-400' },
  warning: { mot: 'Worth watching', point: 'bg-warning-500', texte: 'text-warning-400' },
  warn: { mot: 'Worth watching', point: 'bg-warning-500', texte: 'text-warning-400' },
  info: { mot: 'For your information', point: 'bg-info-500', texte: 'text-info-400' },
  notice: { mot: 'For your information', point: 'bg-info-500', texte: 'text-info-400' },
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

function CeQuiSestPasse({ evenements, statutLive }: Readonly<{ evenements: readonly Evenement[]; statutLive: boolean }>) {
  if (evenements.length === 0) {
    return statutLive ? (
      <CalmState message="No bitcoin movement has been recorded. Nothing requires attention." />
    ) : null
  }

  return (
    <Card>
      <CardHeader
        title="What happened recently?"
        hint="Movements and alerts reported by the service, most recent first"
      />
      <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
        {evenements.map((e, index) => {
          const gravite = graviteLisible(e.severity)
          return (
            <li
              key={`${e.name ?? 'evenement'}-${e.timestamp ?? e.occurredAt ?? String(index)}`}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 text-sm"
            >
              <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-1px] rounded-full', gravite.point)} />
              <span className="min-w-0 flex-1 text-white">{nomLisible(e.name)}</span>
              {e.category === null || e.category === undefined || e.category === '' ? null : (
                <span className="text-xs text-zinc-500">{nomLisible(e.category)}</span>
              )}
              <span className={clsx('text-xs font-medium', gravite.texte)}>{gravite.mot}</span>
              {/* The service also carries an `amount` on some movements. It
                  is NOT rendered here: the contract doesn't say what unit
                  it's denominated in, and showing "$60,000" on an amount
                  that could be in satoshis would be an invention three
                  orders of magnitude off. The amount stays available in
                  the raw response, at the bottom of the page. */}
              <span className="text-xs text-zinc-500 tabular-nums">{formatDateTime(e.timestamp ?? e.occurredAt)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
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

function PreuvesPubliees({ bloc }: Readonly<{ bloc: Resolu<readonly unknown[]> | undefined }>) {
  if (bloc === undefined) return null

  return (
    <Card>
      <CardHeader
        title="What production proofs have been published?"
        hint="Registry of proofs attached to the bitcoin produced"
      />
      <div className="px-5 py-4 sm:px-6">
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">{phrasePreuves(bloc)}</p>
        {/* No column table is drawn while the registry is empty: the shape
            of a proof has never been observed, and inventing headers would
            amount to publishing a schema nobody has seen. The day a proof
            exists, its fields will be read. */}
      </div>
    </Card>
  )
}

export default async function Page() {
  const reponse = await callBackend<Btc>('btc')
  const b = reponse.ok ? reponse.data : null

  const reserve = b?.reserve?.value
  const exposition = b?.exposure?.value
  const produit = b?.btcProduced?.value

  const sats = produit?.totalSats
  const satsNombre = sats === null || sats === undefined ? null : Number(sats)
  const bitcoinProduit =
    satsNombre === null || !Number.isFinite(satsNombre)
      ? '—'
      : (satsNombre / 100_000_000).toLocaleString('en-US', { maximumFractionDigits: 8 })

  // Reserve and exposure: two real amounts, comparable on the same scale.
  // An unreadable entry is dropped, never brought back to zero.
  const montantReserve = montantNumerique(reserve?.balanceUsdc)
  const montantExposition = montantNumerique(exposition?.valueUsdc)
  const postes: PosteBitcoin[] = []
  if (montantReserve !== null) postes.push({ poste: 'Reserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposure', montant: montantExposition, accent: true })

  const evenements = b?.events?.value
  const listeEvenements = evenements ?? []

  // Production pace: the service now exposes a monthly report. Each month
  // is a measured quantity; none is filled in or interpolated.
  const production = b?.production?.value
  const moisProduction = moisExploitables(production)
  const cumulProduction = btcExactDepuisSats(production?.cumulativeSatsEarned)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bitcoin"
        description="What the fund has produced in bitcoin, how its money is split between reserve and market exposure, and what has happened recently."
      />

      <AdminSection>

      {b === null ? (
        <SourceAttendue
          quoi="Bitcoin state could not be read"
          detail="The service did not respond. No value is shown rather than a stale one."
          requis={['A response from the service']}
        />
      ) : (
        <>
          {/* ── What the fund has produced ────────────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure valeur={bitcoinProduit} libelle="Bitcoin produced to date" unite="BTC" />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <SideFact libelle="Dormant reserve" valeur={formatCurrency(reserve?.balanceUsdc, { decimals: 0 })} />
                <SideFact libelle="Value exposed to the market" valeur={formatCurrency(exposition?.valueUsdc, { decimals: 0 })} />
                <SideFact libelle="Last production report" valeur={formatDateTime(produit?.lastReportTime)} />
              </dl>
            </div>
          </Card>

          {/* ── At what pace bitcoin is produced ──────────────────────────── */}
          <ChartFrame
            question="At what pace is bitcoin being produced?"
            unite="in bitcoin, per reported month"
            etat={etatProductionDe(b.production, moisProduction.length)}
            hauteur="h-40"
          >
            <ProductionMensuelleChart mois={moisProduction} cumulBtc={cumulProduction} />
          </ChartFrame>

          {/* ── Where the money sits ──────────────────────────────────────── */}
          <ChartFrame
            question="Where does the money sit?"
            unite="in dollars"
            etat={
              postes.length > 0
                ? { type: 'tracee' }
                : {
                    type: 'attendue',
                    explication:
                      'Neither the reserve nor the exposed value could be read on-chain. Nothing is plotted rather than a breakdown at zero.',
                  }
            }
            hauteur="h-44"
          >
            <ReserveExpositionChart postes={postes} />
          </ChartFrame>

          {/* ── Does the exposed pouch hold its target? ───────────────────── */}
          {exposition === null || exposition === undefined ? null : (
            <Card>
              <CardHeader
                title="Does the exposed share respect its target?"
                hint="Comparison between the share targeted by the contract and the one observed on-chain"
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Exposed pouch</span>
                  <span className="text-zinc-950 dark:text-white">
                    {exposition.pouch === null || exposition.pouch === undefined || exposition.pouch === ''
                      ? 'Not reported'
                      : exposition.pouch}
                  </span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Target share</span>
                  <span className="text-zinc-950 tabular-nums dark:text-white">{partLisible(exposition.targetBps)}</span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Observed share</span>
                  <span className="text-zinc-950 tabular-nums dark:text-white">{partLisible(exposition.actualBps)}</span>
                </li>
              </ul>
            </Card>
          )}

          {/* ── What happened ──────────────────────────────────────────────── */}
          <CeQuiSestPasse evenements={listeEvenements} statutLive={b.events?.status === 'LIVE'} />

          {/* ── What the source doesn't expose ────────────────────────────── */}
          <PreuvesPubliees bloc={b.proofs} />

          {/* Without this introduction, "Waiting on the source" would read
              as "coming soon". These three reads aren't coming: they don't
              exist in the deployed contract. Saying it once above the block
              avoids repeating it under each frame. */}
          <div className="space-y-1 pt-2">
            <AdminSectionTitle as="h2">What the source doesn&apos;t expose</AdminSectionTitle>
            <AdminCaption>
              These three views are built and ready. They remain without a series not due to an incident, but because
              the corresponding read doesn&apos;t exist in the source: the exact reason is noted under each one. The
              day the contract exposes it, the series replaces the sentence and the layout doesn&apos;t move.
            </AdminCaption>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ChartFrame
              question="Where does the bitcoin yield come from?"
              unite="as a percentage of total"
              etat={etatDe(b.attribution, 'The contract exposes no breakdown of bitcoin yield.')}
              hauteur="h-40"
            />
            <ChartFrame
              question="Where is the bitcoin held?"
              unite="in bitcoin, by custody location"
              etat={etatDe(
                b.custody,
                'No custodian is integrated: no custody location has been declared to date.',
              )}
              hauteur="h-40"
            />
            <ChartFrame
              question="At what prices are profits taken?"
              unite="in dollars, per tier"
              etat={etatDe(b.takeProfitTiers, 'The contract exposes no take-profit tiers.')}
              hauteur="h-40"
            />
          </div>
        </>
      )}

      {/* The raw response stays available at the bottom of the page, for
          anyone who wants to check a field the business read doesn't expose. */}
      </AdminSection>
    </div>
  )
}
