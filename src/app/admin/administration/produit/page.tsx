import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, HeroFigure, SideFact } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
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

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

/**
 * Product — one surface for six former pages.
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
  const bitcoinProduit = satsNombre === null ? '—' : formatNumber(satsNombre / 100_000_000, { maximumFractionDigits: 4 })

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

  // Reward curve. The service returns five real points, all at zero on this
  // deployment: the curve isn't parameterized yet. Drawing a flat line would
  // read as "measured zero reward", which would be false.
  const courbeBrute = f?.vendingCurve?.value
  const points: PointCourbe[] =
    courbeBrute === null || courbeBrute === undefined
      ? []
      : courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const courbeParametree = points.some((p) => p.taux !== 0)

  return (
    <AdminPage>
      <PageHeader
        title="Product"
        description="What the fund produces, where its money sits, and how its reward evolves. Six former views brought together here."
      />

      <AdminSection>

      {/* ── What the fund produces ──────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <HeroFigure
            valeur={hashrate ? formatNumber(Number(hashrate.reportedHashrateTh)) : '—'}
            libelle="Reported hashrate"
            unite="TH/s"
          />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SideFact libelle="Bitcoin produced" valeur={`${bitcoinProduit} BTC`} />
            <SideFact
              libelle="Monthly electricity cost"
              valeur={formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 })}
            />
            <SideFact
              libelle="Fund cap"
              valeur={f?.tvlCap?.value ? formatCurrency(f.tvlCap.value, { decimals: 0 }) : '—'}
            />
          </dl>
        </div>
      </Card>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame
          question="Where does the fund's money sit?"
          unite="in dollars"
          etat={
            postes.length > 0
              ? { type: 'tracee' }
              : { type: 'attendue', explication: 'Neither the reserve nor the exposure could be read on-chain.' }
          }
          hauteur="h-44"
        >
          <ReserveExpositionChart postes={postes} />
        </ChartFrame>

        <ChartFrame
          question="How does the reward evolve over time?"
          unite="in percent, per month"
          etat={etatCourbe(points, courbeParametree, f?.vendingCurve)}
        >
          <VendingCurveChart points={points} />
        </ChartFrame>
      </div>

      {/* ── Frames waiting on their source ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartFrame
          question="How does performance compare to history?"
          unite="in percent"
          etat={etatDe(
            backtest.ok ? backtest.data.runs : undefined,
            'No backtest has been run on this deployment yet.',
          )}
          hauteur="h-40"
        />
        <ChartFrame
          question="Where does the yield come from?"
          unite="as a percentage of total"
          etat={etatDe(b?.attribution, 'The yield breakdown has not been calculated yet.')}
          hauteur="h-40"
        />
        <ChartFrame
          question="How does the fleet perform over time?"
          unite="in TH/s"
          etat={etatDe(m?.operationalTelemetry, 'Operational telemetry has not been transmitted yet.')}
          hauteur="h-40"
        />
      </div>
      </AdminSection>
    </AdminPage>
  )
}
