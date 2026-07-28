import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, HeroFigure } from '@/components/admin/cockpit'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminMetric, AdminSection } from '@/components/admin/surfaces'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminPage } from '@/components/admin/typography'
import {
  ReserveExpositionChart,
  VendingCurveChart,
  type PointCourbe,
  type PosteBitcoin,
} from '@/components/admin/product-charts'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { etatSerieDe } from '@/lib/serie-etat'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Consolidated product view' }
export const dynamic = 'force-dynamic'

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

export default async function Page() {
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
  const sats = b?.btcProduced?.value?.totalSats
  const satsNombre = sats === undefined || sats === null ? null : Number(sats)
  const bitcoinProduit =
    satsNombre === null || !Number.isFinite(satsNombre)
      ? null
      : formatNumber(satsNombre / 100_000_000, { maximumFractionDigits: 4 })

  // Reserve and exposure — two real amounts, comparable on the same scale.
  const reserveUsdc = b?.reserve?.value?.balanceUsdc
  const expositionUsdc = b?.exposure?.value?.valueUsdc
  const postes: PosteBitcoin[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    postes.push({ poste: 'Reserve', montant: Number(reserveUsdc) / 1_000_000, accent: false })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposure', montant: Number(expositionUsdc) / 1_000_000, accent: true })
  }
  // Two amounts make a comparison; one makes a bar floating against an axis
  // that promises a second one. When only a single position is readable, the
  // honest rendering is the amount itself.
  const seulPoste = postes.length === 1 ? postes[0] : undefined

  // Reward curve. The service returns five real points, all at zero on this
  // deployment: the curve isn't parameterized yet. Drawing a flat line would
  // read as "measured zero reward", which would be false.
  const courbeBrute = f?.vendingCurve?.value
  const points: PointCourbe[] =
    courbeBrute === null || courbeBrute === undefined
      ? []
      : courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const courbeParametree = points.some((p) => p.taux !== 0)

  const plafond = f?.tvlCap?.value

  return (
    <AdminPage>
      <PageHeader
        title="Consolidated product view"
        description="Production, reserve and reward terms for the fund on a single screen — what used to be six separate portfolio and production pages, each showing one route's raw response."
      />

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
              etat={
                postes.length > 0
                  ? { type: 'tracee' }
                  : { type: 'attendue', explication: 'Neither the reserve nor the exposure could be read on-chain.' }
              }
            >
              {seulPoste === undefined ? (
                <ReserveExpositionChart postes={postes} />
              ) : (
                /* `periode` labels what the single value covers — here the
                   position it belongs to, since a balance covers no period. */
                <SingleObservation
                  valeur={formatCurrency(seulPoste.montant, { fromAtomic: 1, decimals: 0 })}
                  periode={seulPoste.poste}
                  contexte="The other position could not be read on-chain."
                  note="Only one of the two positions is readable — reserve and exposure cannot be compared yet."
                />
              )}
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
    </AdminPage>
  )
}
