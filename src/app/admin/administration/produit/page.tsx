import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminMetric, AdminSection } from '@/components/admin/surfaces'
import {
  ReserveExpositionChart,
  VendingCurveChart,
  type PointCourbe,
  type PosteBitcoin,
} from '@/components/admin/product-charts'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { etatSerieDe } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import { available, editorial, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vue produit consolidée' }
export const dynamic = 'force-dynamic'


function Card({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

function HeroFigure({
  valeur,
  libelle,
  unite,
}: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className={gcc.metricValue}>{valeur}</p>
      <p className={gcc.cellText}>{libelle}{unite ? ` · ${unite}` : ''}</p>
    </div>
  )
}

/**
 * Consolidated product view — one surface for six former pages.
 *
 * `Vault`, `Mining`, `BTC`, `Product`, `Backtest` and `Series 1` used to be
 * six navigation entries that each dumped the raw response of their route.
 * They described the backend's organization, not a question anyone actually
 * asks. Brought together here, they answer four questions: how much the
 * fund produces, where the money sits, how the reward evolves, and what
 * isn't measurable yet.
 *
 * Chart frames are rendered EVEN when the series is missing. That's
 * deliberate: the view exists, its axis and unit are decided, and the day
 * the route responds there's nothing left to redraw. No series is fabricated
 * in the meantime — a test forbids it, and reading it as a real measurement
 * would be worse than showing nothing.
 *
 * ── Composition ────────────────────────────────────────────────────────────
 * The screen is opened from the Administration index rather than the
 * sidebar, so its H1 and description have to say what it consolidates
 * without the menu around them doing that work.
 *
 * Every frame declares a span instead of stretching to whatever the row has
 * left, and none of them declares a height any more: a plotted chart sizes
 * itself from its own data, and an empty state is as tall as its sentence.
 * The three frames still waiting on a source are grouped under one heading
 * that explains the wait once, instead of three unexplained empty boxes
 * scattered through the page.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Mining = {
  readonly hashrate?: Resolu<{ reportedHashrateTh: string; totalBtcEarnedSats: string }>
  readonly electricity?: Resolu<{ monthlyCost: string }>
  readonly operationalTelemetry?: Resolu<unknown>
}

type Btc = {
  readonly reserve?: Resolu<{ balanceUsdc: string | null }>
  readonly exposure?: Resolu<{ valueUsdc: string | null; pouch: string | null }>
  readonly btcProduced?: Resolu<{ totalSats: string }>
  readonly attribution?: Resolu<unknown>
}

type Factsheet = {
  readonly tvlCap?: Resolu<string | number>
  readonly vendingCurve?: Resolu<readonly { month: number; bps: number }[]>
}

type Backtest = { readonly runs?: Resolu<unknown> }

const etatDe = etatSerieDe

/**
 * The shared formatters already render an absence as '—'. A measure tile
 * styles its own absence, so it wants a null rather than that dash: this
 * turns one into the other without ever turning it into a zero.
 */
function ouRien(texte: string): string | null {
  return texte === '—' ? null : texte
}

function bitcoinProduitDe(totalSats: string | null | undefined): string | null {
  if (totalSats === undefined || totalSats === null) return null
  const nombre = Number(totalSats)
  if (!Number.isFinite(nombre)) return null
  return formatNumber(nombre / 100_000_000, { maximumFractionDigits: 4 })
}

function postesReserveExposition(
  reserveUsdc: string | null | undefined,
  expositionUsdc: string | null | undefined,
): PosteBitcoin[] {
  const postes: PosteBitcoin[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    postes.push({ poste: 'Réserve', montant: Number(reserveUsdc) / 1_000_000, accent: false })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposition', montant: Number(expositionUsdc) / 1_000_000, accent: true })
  }
  return postes
}

function pointsCourbeDe(
  courbeBrute: readonly { month: number; bps: number }[] | null | undefined,
): PointCourbe[] {
  if (courbeBrute === null || courbeBrute === undefined) return []
  return courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
}

function courbeParametreeDe(points: readonly PointCourbe[]): boolean {
  return points.some((p) => p.taux !== 0)
}

function etatCourbe(
  points: readonly PointCourbe[],
  courbeParametree: boolean,
  vendingCurve: Resolu<unknown> | undefined,
): EtatSerie {
  if (points.length === 0) {
    return etatDe(vendingCurve, 'Les conditions du produit n’ont pas encore été transmises.')
  }
  if (courbeParametree) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Les cinq échéances du produit sont définies, mais aucun taux n’a encore été enregistré. La courbe apparaîtra dès qu’ils le seront.',
  }
}

function ReserveChart({
  postes,
  seulPoste,
}: Readonly<{ postes: readonly PosteBitcoin[]; seulPoste: PosteBitcoin | undefined }>) {
  if (seulPoste !== undefined) {
    return (
      <SingleObservation
        valeur={formatCurrency(seulPoste.montant, { fromAtomic: 1, decimals: 0 })}
        periode={seulPoste.poste}
        contexte="L’autre position n’a pas pu être lue on-chain."
        note="Une seule des deux positions est lisible — réserve et exposition ne peuvent pas encore être comparées."
      />
    )
  }
  return <ReserveExpositionChart postes={postes} />
}

export default async function Page() {
  const session = await requireSession()
  const user = publicUser(session)
  const [mining, btc, factsheet, backtest] = await Promise.all([
    callBackend<Mining>('mining'),
    callBackend<Btc>('btc'),
    callBackend<Factsheet>('product-factsheet'),
    callBackend<Backtest>('backtest-historical'),
  ])

  const m = mining.ok ? mining.data : null
  const b = btc.ok ? btc.data : null
  const f = factsheet.ok ? factsheet.data : null

  const hashrate = m?.hashrate?.value
  const bitcoinProduit = bitcoinProduitDe(b?.btcProduced?.value?.totalSats)

  const postes = postesReserveExposition(b?.reserve?.value?.balanceUsdc, b?.exposure?.value?.valueUsdc)
  const seulPoste = postes.length === 1 ? postes[0] : undefined

  const points = pointsCourbeDe(f?.vendingCurve?.value)
  const courbeParametree = courbeParametreeDe(points)
  const plafond = f?.tvlCap?.value

  // VER-04: "Reserve split" and "Curve points" are counts whose source must be
  // read to state them. When the bitcoin or factsheet call failed, or the
  // reading is absent, the count is unavailable — not "0".
  const reserveSplitCell: Availability<string> =
    !btc.ok
      ? unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
      : b?.reserve?.value?.balanceUsdc === undefined && b?.exposure?.value?.valueUsdc === undefined
        ? unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'reserve_and_exposure_unreadable' })
        : available(String(postes.length), { provenance: 'live', asOf: null })
  const curvePointsCell: Availability<string> =
    !factsheet.ok
      ? unavailable({ endpoint: '/api/v1/product/factsheet', status: 'UNAVAILABLE', reason: 'product_factsheet_unreachable' })
      : f?.vendingCurve?.value === null || f?.vendingCurve?.value === undefined
        ? unavailable({ endpoint: '/api/v1/product/factsheet', status: 'PARTIAL', reason: 'vending_curve_absent' })
        : available(String(points.length), { provenance: 'live', asOf: null })
  // Single formatted figures: editorial when their source was read, else absent.
  const miningFigure = (value: string): Availability<string> =>
    mining.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/mining', status: 'UNAVAILABLE', reason: 'mining_source_unreachable' })
  const btcFigure = (value: string): Availability<string> =>
    btc.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
  const factsheetFigure = (value: string): Availability<string> =>
    factsheet.ok ? editorial(value) : unavailable({ endpoint: '/api/v1/product/factsheet', status: 'UNAVAILABLE', reason: 'product_factsheet_unreachable' })

  return (
    <GreenCommandCenterShell
      label="Hearst Connect — poste de pilotage produit consolidé"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Synthèse produit consolidée">
        <Panel className={gcc.metricCard}><h2>Hashrate</h2><div className={gcc.metricText}><Reading value={hashrate ? miningFigure(formatNumber(Number(hashrate.reportedHashrateTh))) : unavailable({ endpoint: '/api/v1/mining', status: 'PARTIAL', reason: 'hashrate_unreadable' })} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>BTC produit</h2><div className={gcc.metricText}><Reading value={bitcoinProduit === null ? unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'btc_produced_unreadable' }) : btcFigure(bitcoinProduit)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Répartition de la réserve</h2><div className={gcc.metricText}><Reading value={reserveSplitCell} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Points de courbe</h2><div className={gcc.metricText}><Reading value={curvePointsCell} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Plafond du fonds</h2><div className={gcc.metricText}><Reading value={plafond ? factsheetFigure(ouRien(formatCurrency(plafond, { decimals: 0 })) ?? '—') : unavailable({ endpoint: '/api/v1/product/factsheet', status: 'PARTIAL', reason: 'tvl_cap_absent' })} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Vue <span>consolidée</span></p>
          <p className={gcc.decisionMeta}>{b === null ? 'Source BTC indisponible' : 'Source BTC joignable'}</p>
          <p className={gcc.decisionActionMuted}>{courbeParametree ? 'Courbe configurée' : 'Courbe en attente des taux'}</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Détails produit consolidés">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Vue produit consolidée</h2>
          </div>
          <div className={gcc.heroBody}>
      {/* ── What the fund produces ──────────────────────────────────────────
          The hashrate is the measure this page leads with, so it takes five
          columns; the three figures that qualify it are equal tiles across
          the remaining seven, and `count` keeps their row full. */}
      <AdminGrid>
        <AdminCol span={5}>
          <Card className="h-full p-6">
            <HeroFigure
              valeur={hashrate ? formatNumber(Number(hashrate.reportedHashrateTh)) : '—'}
              libelle="Hashrate renseigné"
              unite="TH/s"
            />
          </Card>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="BTC produit" value={bitcoinProduit} unit="BTC" />
            <AdminMetric
              label="Coût mensuel d’électricité"
              value={ouRien(formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 }))}
            />
            <AdminMetric
              label="Plafond du fonds"
              value={plafond ? ouRien(formatCurrency(plafond, { decimals: 0 })) : null}
            />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      {/* ── Where the money sits, and what it pays ─────────────────────── */}
      <AdminSection
        title="Réserve et rémunération"
        description="Les deux lectures sur lesquelles le produit est réellement mesuré aujourd’hui : comment son capital est réparti, et ce que le contrat paie sur ses échéances."
      >
        <AdminGrid>
          <AdminCol span={6}>
            <ChartFrame
              question="Où se trouve l’argent du fonds ?"
              unite="en dollars"
              etat={postes.length > 0 ? { type: 'tracee' } : { type: 'attendue', explication: 'Ni la réserve ni l’exposition n’ont pu être lues on-chain.' }}
            >
              <ReserveChart postes={postes} seulPoste={seulPoste} />
            </ChartFrame>
          </AdminCol>

          <AdminCol span={6}>
            <ChartFrame
              question="Comment la rémunération évolue-t-elle dans le temps ?"
              unite="en pourcentage, par mois"
              etat={etatCourbe(points, courbeParametree, f?.vendingCurve)}
            >
              <VendingCurveChart points={points} />
            </ChartFrame>
          </AdminCol>
        </AdminGrid>
      </AdminSection>

      {/* ── Frames waiting on their source ─────────────────────────────── */}
      <AdminSection
        title="Pas encore mesurable"
        description="Trois vues dont la question, l’axe et l’unité sont déjà décidés. Aucune ne trace quoi que ce soit tant que le service ne fournit pas sa série — une courbe de substitution se lirait comme une mesure."
      >
        {/* Three equal thirds. Each frame states its own reason for waiting;
            the heading above states, once, why they are grouped. */}
        <AdminGrid>
          <AdminCol span={4}>
            <ChartFrame
              question="Comment la performance se compare-t-elle à l’historique ?"
              unite="en pourcentage"
              etat={etatDe(
                backtest.ok ? backtest.data.runs : undefined,
                'Aucun backtest n’a encore été exécuté sur ce déploiement.',
              )}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="D’où provient le rendement ?"
              unite="en pourcentage du total"
              etat={etatDe(b?.attribution, 'La ventilation du rendement n’a pas encore été calculée.')}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="Comment la flotte performe-t-elle dans le temps ?"
              unite="en TH/s"
              etat={etatDe(m?.operationalTelemetry, 'La télémétrie opérationnelle n’a pas encore été transmise.')}
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Flux de backtest</h3><p className={gcc.cellText}>{backtest.ok ? (backtest.data.runs?.status ?? 'Non renseigné') : 'Indisponible'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Attribution</h3><p className={gcc.cellText}>{b?.attribution?.status ?? 'Non renseigné'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Télémétrie</h3><p className={gcc.cellText}>{m?.operationalTelemetry?.status ?? 'Non renseigné'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes consolidées">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Périmètre</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Consolide la production, la réserve, les conditions de rémunération et les lectures manquantes.</p>
            <p className={gcc.cellText}>Aucune série n’est fabriquée lorsque la source est absente.</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Points d’accès</h3><p className={gcc.cellText}>`mining`, `btc`, `product-factsheet`, `backtest-historical`</p></article>
          <article className={gcc.infoCell}><h3>Production</h3><p className={gcc.cellText}>Hashrate + BTC produit</p></article>
          <article className={gcc.infoCell}><h3>Réserve</h3><p className={gcc.cellText}>Répartition réserve et exposition</p></article>
          <article className={gcc.infoCell}><h3>Rémunération</h3><p className={gcc.cellText}>Courbe de rémunération par mois</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Lacunes du contrat</h3>
          <p className={gcc.cellText}>Attribution, paliers de prise de profit et télémétrie restent explicites lorsqu’ils ne sont pas exposés.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
