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

export const metadata: Metadata = { title: 'Consolidated product view' }
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
    postes.push({ poste: 'Reserve', montant: Number(reserveUsdc) / 1_000_000, accent: false })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposure', montant: Number(expositionUsdc) / 1_000_000, accent: true })
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
    return etatDe(vendingCurve, 'The product terms have not been transmitted yet.')
  }
  if (courbeParametree) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      "The product's five maturities are defined, but no rate has been recorded yet. The curve will appear once they are.",
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
        contexte="The other position could not be read on-chain."
        note="Only one of the two positions is readable — reserve and exposure cannot be compared yet."
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
      label="Hearst Connect consolidated product cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Consolidated product summary">
        <Panel className={gcc.metricCard}><h2>Hashrate</h2><div className={gcc.metricText}><Reading value={hashrate ? miningFigure(formatNumber(Number(hashrate.reportedHashrateTh))) : unavailable({ endpoint: '/api/v1/mining', status: 'PARTIAL', reason: 'hashrate_unreadable' })} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Bitcoin produced</h2><div className={gcc.metricText}><Reading value={bitcoinProduit === null ? unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'btc_produced_unreadable' }) : btcFigure(bitcoinProduit)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Reserve split</h2><div className={gcc.metricText}><Reading value={reserveSplitCell} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Curve points</h2><div className={gcc.metricText}><Reading value={curvePointsCell} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Fund cap</h2><div className={gcc.metricText}><Reading value={plafond ? factsheetFigure(ouRien(formatCurrency(plafond, { decimals: 0 })) ?? '—') : unavailable({ endpoint: '/api/v1/product/factsheet', status: 'PARTIAL', reason: 'tvl_cap_absent' })} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Consolidated <span>view</span></p>
          <p className={gcc.decisionMeta}>{b === null ? 'BTC source unavailable' : 'BTC source reachable'}</p>
          <p className={gcc.decisionActionMuted}>{courbeParametree ? 'Curve configured' : 'Curve waiting on rates'}</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Consolidated product details">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Consolidated product view</h2>
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
              libelle="Reported hashrate"
              unite="TH/s"
            />
          </Card>
        </AdminCol>
        <AdminCol span={7}>
          <AdminMetricGrid count={3} className="h-full">
            <AdminMetric label="Bitcoin produced" value={bitcoinProduit} unit="BTC" />
            <AdminMetric
              label="Monthly electricity cost"
              value={ouRien(formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 }))}
            />
            <AdminMetric
              label="Fund cap"
              value={plafond ? ouRien(formatCurrency(plafond, { decimals: 0 })) : null}
            />
          </AdminMetricGrid>
        </AdminCol>
      </AdminGrid>

      {/* ── Where the money sits, and what it pays ─────────────────────── */}
      <AdminSection
        title="Reserve and reward"
        description="The two readings the product is actually measured on today: how its capital is split, and what the contract pays over its maturities."
      >
        <AdminGrid>
          <AdminCol span={6}>
            <ChartFrame
              question="Where does the fund's money sit?"
              unite="in dollars"
              etat={postes.length > 0 ? { type: 'tracee' } : { type: 'attendue', explication: 'Neither the reserve nor the exposure could be read on-chain.' }}
            >
              <ReserveChart postes={postes} seulPoste={seulPoste} />
            </ChartFrame>
          </AdminCol>

          <AdminCol span={6}>
            <ChartFrame
              question="How does the reward evolve over time?"
              unite="in percent, per month"
              etat={etatCourbe(points, courbeParametree, f?.vendingCurve)}
            >
              <VendingCurveChart points={points} />
            </ChartFrame>
          </AdminCol>
        </AdminGrid>
      </AdminSection>

      {/* ── Frames waiting on their source ─────────────────────────────── */}
      <AdminSection
        title="Not measurable yet"
        description="Three views whose question, axis and unit are already decided. None of them draws anything until the service supplies its series — a placeholder curve would read as a measurement."
      >
        {/* Three equal thirds. Each frame states its own reason for waiting;
            the heading above states, once, why they are grouped. */}
        <AdminGrid>
          <AdminCol span={4}>
            <ChartFrame
              question="How does performance compare to history?"
              unite="in percent"
              etat={etatDe(
                backtest.ok ? backtest.data.runs : undefined,
                'No backtest has been run on this deployment yet.',
              )}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="Where does the yield come from?"
              unite="as a percentage of total"
              etat={etatDe(b?.attribution, 'The yield breakdown has not been calculated yet.')}
            />
          </AdminCol>
          <AdminCol span={4}>
            <ChartFrame
              question="How does the fleet perform over time?"
              unite="in TH/s"
              etat={etatDe(m?.operationalTelemetry, 'Operational telemetry has not been transmitted yet.')}
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Backtest feed</h3><p className={gcc.cellText}>{backtest.ok ? (backtest.data.runs?.status ?? 'Not reported') : 'Unavailable'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Attribution</h3><p className={gcc.cellText}>{b?.attribution?.status ?? 'Not reported'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Telemetry</h3><p className={gcc.cellText}>{m?.operationalTelemetry?.status ?? 'Not reported'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Consolidated notes">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Scope</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Consolidates production, reserve, reward terms, and missing reads.</p>
            <p className={gcc.cellText}>No series is fabricated when source is absent.</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Endpoints</h3><p className={gcc.cellText}>`mining`, `btc`, `product-factsheet`, `backtest-historical`</p></article>
          <article className={gcc.infoCell}><h3>Production</h3><p className={gcc.cellText}>Hashrate + BTC produced</p></article>
          <article className={gcc.infoCell}><h3>Reserve</h3><p className={gcc.cellText}>Reserve and exposure split</p></article>
          <article className={gcc.infoCell}><h3>Reward</h3><p className={gcc.cellText}>Vending curve by month</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Contract gaps</h3>
          <p className={gcc.cellText}>Attribution, take-profit tiers, and telemetry stay explicit when not exposed.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
