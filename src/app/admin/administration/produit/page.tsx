import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, HeroFigure, SideFact } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { CockpitSection } from '@/components/admin/cockpit-section'
import {
  ReserveExpositionChart,
  VendingCurveChart,
  type PointCourbe,
  type PosteBitcoin,
} from '@/components/admin/product-charts'
import { callBackend } from '@/lib/backend/client'
import { etatSerieDe } from '@/lib/serie-etat'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Produit' }
export const dynamic = 'force-dynamic'

/**
 * Produit — une surface pour six anciennes pages.
 *
 * `Vault`, `Mining`, `BTC`, `Product`, `Backtest` et `Series 1` étaient six
 * entrées de navigation qui déversaient chacune la réponse brute de leurs
 * routes. Elles décrivaient l'organisation du backend, pas une question que
 * quelqu'un se pose. Réunies ici, elles répondent à quatre questions :
 * combien le fonds produit, où l'argent dort, comment la rémunération évolue,
 * et ce qui n'est pas encore mesurable.
 *
 * Les cadres de graphique sont posés MÊME quand la série manque. C'est
 * délibéré : la vue existe, son axe et son unité sont décidés, et le jour où
 * la route répond il n'y a rien à redessiner. Aucune série n'est fabriquée en
 * attendant — un test l'interdit, et la lire comme une mesure serait pire que
 * de ne rien montrer.
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

function usdc(atomique: string | null | undefined, decimales = 0): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const n = Number(atomique)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

function etatCourbe(
  points: readonly PointCourbe[],
  courbeParametree: boolean,
  vendingCurve: Resolu<unknown> | undefined,
): EtatSerie {
  if (points.length === 0) {
    return etatDe(vendingCurve, 'Les termes du produit ne sont pas encore transmis.')
  }
  if (courbeParametree) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Les cinq échéances du produit sont bien définies, mais aucun taux n’y est encore inscrit. La courbe s’affichera dès qu’ils le seront.',
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
    satsNombre === null ? '—' : (satsNombre / 100_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 4 })

  // Réserve et exposition — deux montants réels, comparables sur une même échelle.
  const reserveUsdc = b?.reserve?.value?.balanceUsdc
  const expositionUsdc = b?.exposure?.value?.valueUsdc
  const postes: PosteBitcoin[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    postes.push({ poste: 'Réserve', montant: Number(reserveUsdc) / 1_000_000, accent: false })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposition', montant: Number(expositionUsdc) / 1_000_000, accent: true })
  }

  // Courbe de rémunération. Le service renvoie cinq points réels, tous à zéro
  // sur ce déploiement : la courbe n'est pas encore paramétrée. Tracer une
  // ligne plate se lirait comme « rémunération nulle mesurée », ce qui est faux.
  const courbeBrute = f?.vendingCurve?.value
  const points: PointCourbe[] =
    courbeBrute === null || courbeBrute === undefined
      ? []
      : courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const courbeParametree = points.some((p) => p.taux !== 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Produit"
        description="Ce que le fonds produit, où son argent se trouve, et comment sa rémunération évolue. Six anciennes vues réunies ici."
      />

      <CockpitSection>

      {/* ── Ce que le fonds produit ─────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <HeroFigure
            valeur={hashrate ? Number(hashrate.reportedHashrateTh).toLocaleString('fr-FR') : '—'}
            libelle="Puissance de calcul déclarée"
            unite="TH/s"
          />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SideFact libelle="Bitcoin produit" valeur={`${bitcoinProduit} BTC`} />
            <SideFact libelle="Coût mensuel d’électricité" valeur={usdc(m?.electricity?.value?.monthlyCost)} />
            <SideFact libelle="Plafond du fonds" valeur={f?.tvlCap?.value ? usdc(String(f.tvlCap.value)) : '—'} />
          </dl>
        </div>
      </Card>

      {/* ── Graphiques ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame
          question="Où l’argent du fonds se trouve-t-il ?"
          unite="en dollars"
          etat={
            postes.length > 0
              ? { type: 'tracee' }
              : { type: 'attendue', explication: 'Ni la réserve ni l’exposition n’ont pu être lues sur la chaîne.' }
          }
          hauteur="h-44"
        >
          <ReserveExpositionChart postes={postes} />
        </ChartFrame>

        <ChartFrame
          question="Comment la rémunération évolue-t-elle sur la durée ?"
          unite="en pourcentage, par mois"
          etat={etatCourbe(points, courbeParametree, f?.vendingCurve)}
        >
          <VendingCurveChart points={points} />
        </ChartFrame>
      </div>

      {/* ── Cadres en attente de leur source ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartFrame
          question="Comment la performance se compare-t-elle à l’historique ?"
          unite="en pourcentage"
          etat={etatDe(
            backtest.ok ? backtest.data.runs : undefined,
            'Aucun rétro-test n’a encore été exécuté sur ce déploiement.',
          )}
          hauteur="h-40"
        />
        <ChartFrame
          question="D’où vient le rendement ?"
          unite="en pourcentage du total"
          etat={etatDe(b?.attribution, 'La décomposition du rendement n’est pas encore calculée.')}
          hauteur="h-40"
        />
        <ChartFrame
          question="Comment la flotte se comporte-t-elle dans le temps ?"
          unite="en TH/s"
          etat={etatDe(m?.operationalTelemetry, 'La télémétrie d’exploitation n’est pas encore transmise.')}
          hauteur="h-40"
        />
      </div>
      </CockpitSection>
    </div>
  )
}
