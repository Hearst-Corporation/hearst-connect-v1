import {
  ChartFrame,
  ProductionMensuelleChart,
  ReserveExpositionChart,
  plottableAsChart,
  type SeriesState,
  type MoisProduction,
  type PosteBitcoin,
} from '@/components/charts'
import { MetricValue, Panel, PanelHeader, SideFact, SourceAttendue } from '@/components/compositions'
import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { AppRail } from '@/components/layout/app-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminSection } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { mapAvailability, measuredCount } from '@/lib/vaults/model'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { seriesStateFrom, type ChampResolu } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bitcoin production' }
export const dynamic = 'force-dynamic'

/**
 * Production Bitcoin — surface USER.
 *
 * Vue propriétaire, calme et honnête, de ce que le fonds a produit : bitcoin
 * attesté depuis l'origine, rythme de production, et répartition réserve /
 * exposition. Même endpoint session-tier (`btc`) et même Design System que
 * `/admin/btc` — présentation resserrée pour le propriétaire.
 *
 * Véracité par construction (corrige F-05 à la source) : chaque figure et chaque
 * compte est dérivé du STATUT réel du champ backend via `availabilityFromResolu`
 * puis `mapAvailability` / `measuredCount`. Une donnée `STALE` n'est jamais
 * présentée « En direct ». Aucun `?? 0`, aucune valeur inventée.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

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
  readonly production?: Resolu<Production>
}

/* ── Satoshis (adapté de /admin/btc — conversion exacte sur la chaîne) ─────── */

const ENTIER_DECIMAL = /^\d+$/
const PERIODE_MENSUELLE = /^(\d{4})-(\d{2})$/

/** Satoshis → BTC, au satoshi près (sur la chaîne, sans dérive flottante). */
function btcExactDepuisSats(sats: string | null | undefined): string | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  const rembourre = sats.padStart(9, '0')
  const entiere = Number(rembourre.slice(0, -8))
  return `${entiere.toLocaleString('en-US')}.${rembourre.slice(-8)}`
}

/** La même valeur en nombre, pour l'ÉCHELLE d'un graphique uniquement. */
function btcNombreDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  return Number(sats) / 100_000_000
}

/** Un montant atomique USDC → nombre, pour l'ÉCHELLE d'un graphique uniquement. */
function montantNumerique(atomique: string | null | undefined): number | null {
  if (atomique === null || atomique === undefined || atomique === '') return null
  const n = Number(atomique)
  return Number.isFinite(n) ? n / 1_000_000 : null
}

/** "2026-07" → "Jul 2026". Une période non reconnue est rendue telle quelle. */
function moisLisible(periode: string): string {
  const parts = PERIODE_MENSUELLE.exec(periode)
  if (parts === null) return periode
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1))
  if (Number.isNaN(date.getTime())) return periode
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Rapports bruts → mois exploitables. Un mois illisible est écarté, jamais comblé. */
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
  return retenus.sort((a, b) => a.periode.localeCompare(b.periode))
}

/** Une part se lit en pourcentage, jamais en points de base bruts. */
function partLisible(bps: number | null | undefined): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
}

/** Trois silences distincts pour la série de production (repris de /admin/btc). */
function etatProductionDe(bloc: ChampResolu | undefined, moisRetenus: number): SeriesState {
  if (moisRetenus > 0) return { type: 'plotted' }
  if (bloc?.status === 'LIVE') {
    return {
      type: 'empty',
      explication:
        'Production reports were queried: no usable month appears yet. The series will appear with the first report.',
    }
  }
  return seriesStateFrom(bloc, 'Monthly production reports have not been submitted by the service yet.')
}

function etatReserveDe(postes: readonly PosteBitcoin[]): SeriesState {
  if (postes.length > 0) return { type: 'plotted' }
  return {
    type: 'pending',
    explication:
      'Neither reserve nor exposed value could be read on-chain. Nothing is plotted rather than a zero split.',
  }
}

export default async function Page() {
  const [session, reponse] = await Promise.all([requireSession(), callBackend<Btc>('btc')])
  const user = publicUser(session)
  const b = reponse.ok ? reponse.data : null
  const endpoint = '/api/v1/btc'

  // Chaque cellule dérive du STATUT réel de son champ (véracité, pas de faux live).
  const produced = availabilityFromResolu(b?.btcProduced, endpoint)
  const reserve = availabilityFromResolu(b?.reserve, endpoint)
  const exposure = availabilityFromResolu(b?.exposure, endpoint)
  const production = availabilityFromResolu(b?.production, endpoint)

  const btcProduitCell = mapAvailability(produced, (p) =>
    formatNumber(btcNombreDepuisSats(p.totalSats), { maximumFractionDigits: 8 }),
  )
  const reserveCell = mapAvailability(reserve, (r) => formatCurrency(r.balanceUsdc, { decimals: 0 }))
  const expositionCell = mapAvailability(exposure, (e) => formatCurrency(e.valueUsdc, { decimals: 0 }))
  const dernierRapportCell = mapAvailability(produced, (p) => formatDateTime(p.lastReportTime))
  const moisAvail = mapAvailability(production, (prod) => moisExploitables(prod))
  const rapportsMensuelsCell = measuredCount(moisAvail)

  // Modèle de vue pour les graphiques (échelle numérique uniquement).
  const productionValue = b?.production?.value
  const moisProduction = moisExploitables(productionValue)
  const cumulProduction = btcExactDepuisSats(productionValue?.cumulativeSatsEarned)
  const dernierMois = moisProduction.at(-1)
  const reserveValue = b?.reserve?.value
  const expositionValue = b?.exposure?.value
  const postes: PosteBitcoin[] = []
  const montantReserve = montantNumerique(reserveValue?.balanceUsdc)
  const montantExposition = montantNumerique(expositionValue?.valueUsdc)
  if (montantReserve !== null) postes.push({ poste: 'Reserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposure', montant: montantExposition, accent: true })

  const bitcoinProduit = formatNumber(btcNombreDepuisSats(b?.btcProduced?.value?.totalSats), {
    maximumFractionDigits: 8,
  })
  const singleMonth =
    dernierMois !== undefined && !plottableAsChart(moisProduction.length) ? dernierMois : null
  const hasExposition = expositionValue !== null && expositionValue !== undefined
  const pouch = expositionValue?.pouch
  const pouchLabel = pouch === null || pouch === undefined || pouch === '' ? 'Not provided' : pouch

  return (
    <ConsoleShell
      label="Bitcoin production — Hearst Connect Account"
      rail={<AppRail currentHref="/account/bitcoin" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Bitcoin production summary">
        <Panel tone="plain" className={csl.metricCard}><h2>BTC produced</h2><div className={csl.metricText}><Reading value={btcProduitCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Idle reserve</h2><div className={csl.metricText}><Reading value={reserveCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Exposed value</h2><div className={csl.metricText}><Reading value={expositionCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Monthly reports</h2><div className={csl.metricText}><Reading value={rapportsMensuelsCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Last report</h2><div className={csl.metricText}><Reading value={dernierRapportCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Bitcoin <span>production</span></p>
          <p className={csl.decisionMeta}>{b === null ? 'Source unavailable' : 'Source available'}</p>
          <p className={csl.decisionActionMuted}>No projected yield</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Bitcoin production details">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Bitcoin production</h2></div>
          <div className={csl.heroBody}>
            {b === null ? (
              <SourceAttendue
                quoi="Bitcoin state could not be read"
                detail="The service did not respond. No value is shown rather than a stale one."
                requis={['A response from the service']}
              />
            ) : (
              <>
                <AdminSection
                  title="What the fund has produced"
                  description="Bitcoin attested by the contract since inception, and the pace at which it accumulates."
                >
                  <Panel tone="plain" className="flex flex-col p-6">
                    <MetricValue valeur={bitcoinProduit} libelle="Bitcoin produced to date" unite="BTC" />
                    <AdminMetricGrid count={3} className="mt-6">
                      <SideFact libelle="Idle reserve" valeur={formatCurrency(reserveValue?.balanceUsdc, { decimals: 0 })} />
                      <SideFact libelle="Market-exposed value" valeur={formatCurrency(expositionValue?.valueUsdc, { decimals: 0 })} />
                      <SideFact libelle="Last production report" valeur={formatDateTime(b.btcProduced?.value?.lastReportTime)} />
                    </AdminMetricGrid>
                  </Panel>

                  <ChartFrame
                    question="At what pace is bitcoin produced?"
                    unite="in bitcoin, per reported month"
                    etat={etatProductionDe(b.production, moisProduction.length)}
                  >
                    {singleMonth === null ? (
                      <ProductionMensuelleChart mois={moisProduction} cumulBtc={cumulProduction} />
                    ) : (
                      <SingleObservation
                        valeur={singleMonth.btcExact}
                        unite="BTC"
                        periode={singleMonth.libelle}
                        contexte={
                          cumulProduction === null
                            ? 'Bitcoin attested by the service for this month, to the satoshi.'
                            : `Bitcoin attested by the service for this month, to the satoshi. Cumulative since inception: ${cumulProduction} BTC.`
                        }
                        note="Only one month has been reported to date. A pace is the gap between two months, and there is no second month yet — the chart will appear with the next report."
                      />
                    )}
                  </ChartFrame>
                </AdminSection>

                <AdminSection
                  title="Where the capital sits"
                  description="The same two amounts read as a split: what sits in reserve, and what is exposed to the market."
                >
                  <AdminGrid>
                    <AdminCol span={hasExposition ? 7 : 12}>
                      <ChartFrame question="Where does the capital sit?" unite="in dollars" etat={etatReserveDe(postes)}>
                        <ReserveExpositionChart postes={postes} />
                      </ChartFrame>
                    </AdminCol>
                    {hasExposition ? (
                      <AdminCol span={5}>
                        <Panel tone="plain" className="flex h-full flex-col">
                          <PanelHeader
                            title="Does the exposed share meet its target?"
                            hint="Comparison between the contract target share and the on-chain observed share"
                          />
                          <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                            <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                              <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Exposed pocket</span>
                              <span className="min-w-0 flex-1 text-zinc-950 dark:text-white">{pouchLabel}</span>
                            </li>
                            <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                              <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Target share</span>
                              <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">{partLisible(expositionValue?.targetBps)}</span>
                            </li>
                            <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                              <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Observed share</span>
                              <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">{partLisible(expositionValue?.actualBps)}</span>
                            </li>
                          </ul>
                        </Panel>
                      </AdminCol>
                    ) : null}
                  </AdminGrid>
                </AdminSection>
              </>
            )}
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Production status</h3><p className={csl.cellText}>{moisProduction.length > 0 ? 'Reported' : 'Pending'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Reserve split</h3><p className={csl.cellText}>{postes.length > 0 ? 'Readable' : 'Unavailable'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Cumulative since inception</h3><p className={csl.cellText}>{cumulProduction === null ? 'Not reported' : `${cumulProduction} BTC`}</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Bitcoin production notes">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Guardrails</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>A single month is shown as an observation, not a trend.</p>
            <p className={csl.cellText}>Satoshis are converted to the exact figure, without floating-point drift.</p>
            <p className={csl.cellText}>A dated source is never presented as &quot;Live&quot;.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Endpoint</h3><p className={csl.cellText}>Service bitcoin production</p></article>
          <article className={csl.infoCell}><h3>Reserve model</h3><p className={csl.cellText}>Reserve versus exposure in USD.</p></article>
          <article className={csl.infoCell}><h3>Production model</h3><p className={csl.cellText}>Satoshis converted with exact decimals.</p></article>
          <article className={csl.infoCell}><h3>Veracity</h3><p className={csl.cellText}>Every count inherits its source freshness.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Your account</h3>
          <p className={csl.cellText}>The dashboard brings together your data coverage.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
