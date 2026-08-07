import {
  ChartFrame,
  ProductionMensuelleChart,
  ReserveExpositionChart,
  plottableAsChart,
  type EtatSerie,
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
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Production Bitcoin' }
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
function etatProductionDe(bloc: ChampResolu | undefined, moisRetenus: number): EtatSerie {
  if (moisRetenus > 0) return { type: 'tracee' }
  if (bloc?.status === 'LIVE') {
    return {
      type: 'vide',
      explication:
        'Les rapports de production ont bien été interrogés : aucun mois exploitable n’apparaît encore. La série apparaîtra au premier rapport.',
    }
  }
  return etatSerieDe(bloc, 'Les rapports de production mensuels ne sont pas encore transmis par le service.')
}

function etatReserveDe(postes: readonly PosteBitcoin[]): EtatSerie {
  if (postes.length > 0) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Ni la réserve ni la valeur exposée n’ont pu être lues on-chain. Rien n’est tracé plutôt qu’une répartition à zéro.',
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
  if (montantReserve !== null) postes.push({ poste: 'Réserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposition', montant: montantExposition, accent: true })

  const bitcoinProduit = formatNumber(btcNombreDepuisSats(b?.btcProduced?.value?.totalSats), {
    maximumFractionDigits: 8,
  })
  const singleMonth =
    dernierMois !== undefined && !plottableAsChart(moisProduction.length) ? dernierMois : null
  const hasExposition = expositionValue !== null && expositionValue !== undefined
  const pouch = expositionValue?.pouch
  const pouchLabel = pouch === null || pouch === undefined || pouch === '' ? 'Non renseigné' : pouch

  return (
    <ConsoleShell
      label="Production bitcoin — Espace Hearst Connect"
      rail={<AppRail currentHref="/espace/bitcoin" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Résumé de la production bitcoin">
        <Panel tone="plain" className={csl.metricCard}><h2>BTC produit</h2><div className={csl.metricText}><Reading value={btcProduitCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Réserve dormante</h2><div className={csl.metricText}><Reading value={reserveCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Valeur exposée</h2><div className={csl.metricText}><Reading value={expositionCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Rapports mensuels</h2><div className={csl.metricText}><Reading value={rapportsMensuelsCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Dernier rapport</h2><div className={csl.metricText}><Reading value={dernierRapportCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Production <span>bitcoin</span></p>
          <p className={csl.decisionMeta}>{b === null ? 'Source indisponible' : 'Source disponible'}</p>
          <p className={csl.decisionActionMuted}>Aucun rendement projeté</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Détails de la production bitcoin">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Production Bitcoin</h2></div>
          <div className={csl.heroBody}>
            {b === null ? (
              <SourceAttendue
                quoi="L’état bitcoin n’a pas pu être lu"
                detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur obsolète."
                requis={['Une réponse du service']}
              />
            ) : (
              <>
                <AdminSection
                  title="Ce que le fonds a produit"
                  description="Bitcoin attesté par le contrat depuis l’origine, et le rythme auquel il s’accumule."
                >
                  <Panel tone="plain" className="flex flex-col p-6">
                    <MetricValue valeur={bitcoinProduit} libelle="Bitcoin produit à ce jour" unite="BTC" />
                    <AdminMetricGrid count={3} className="mt-6">
                      <SideFact libelle="Réserve dormante" valeur={formatCurrency(reserveValue?.balanceUsdc, { decimals: 0 })} />
                      <SideFact libelle="Valeur exposée au marché" valeur={formatCurrency(expositionValue?.valueUsdc, { decimals: 0 })} />
                      <SideFact libelle="Dernier rapport de production" valeur={formatDateTime(b.btcProduced?.value?.lastReportTime)} />
                    </AdminMetricGrid>
                  </Panel>

                  <ChartFrame
                    question="À quel rythme le bitcoin est-il produit ?"
                    unite="en bitcoin, par mois rapporté"
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
                            ? 'Bitcoin attesté par le service pour ce mois, au satoshi près.'
                            : `Bitcoin attesté par le service pour ce mois, au satoshi près. Cumul depuis l’origine : ${cumulProduction} BTC.`
                        }
                        note="Un seul mois a été rapporté à ce jour. Un rythme est l’écart entre deux mois, et il n’y a pas encore de deuxième mois — le graphique apparaîtra au prochain rapport."
                      />
                    )}
                  </ChartFrame>
                </AdminSection>

                <AdminSection
                  title="Où se trouve l’argent"
                  description="Les deux mêmes montants lus comme une répartition : ce qui dort en réserve, et ce qui est exposé au marché."
                >
                  <AdminGrid>
                    <AdminCol span={hasExposition ? 7 : 12}>
                      <ChartFrame question="Où se trouve l’argent ?" unite="en dollars" etat={etatReserveDe(postes)}>
                        <ReserveExpositionChart postes={postes} />
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
                              <span className="min-w-0 flex-1 text-zinc-950 tabular-nums dark:text-white">{partLisible(expositionValue?.targetBps)}</span>
                            </li>
                            <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
                              <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">Part observée</span>
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
          <Panel tone="plain" className={csl.signalCard}><h3>État de la production</h3><p className={csl.cellText}>{moisProduction.length > 0 ? 'Rapporté' : 'En attente'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Répartition de la réserve</h3><p className={csl.cellText}>{postes.length > 0 ? 'Lisible' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Cumul depuis l’origine</h3><p className={csl.cellText}>{cumulProduction === null ? 'Non transmis' : `${cumulProduction} BTC`}</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Notes de production bitcoin">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Garde-fous</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Un mois est affiché comme observation, pas comme tendance.</p>
            <p className={csl.cellText}>Les satoshis sont convertis au chiffre exact, sans dérive flottante.</p>
            <p className={csl.cellText}>Une source datée n’est jamais présentée « En direct ».</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Point d’accès</h3><p className={csl.cellText}>Production bitcoin du service</p></article>
          <article className={csl.infoCell}><h3>Modèle de réserve</h3><p className={csl.cellText}>Réserve contre exposition en USD.</p></article>
          <article className={csl.infoCell}><h3>Modèle de production</h3><p className={csl.cellText}>Satoshis convertis avec décimales exactes.</p></article>
          <article className={csl.infoCell}><h3>Véracité</h3><p className={csl.cellText}>Chaque compte hérite de la fraîcheur de sa source.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Votre espace</h3>
          <p className={csl.cellText}>Le tableau de bord réunit la couverture de vos données.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
