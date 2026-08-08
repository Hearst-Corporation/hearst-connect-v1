import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import {
  ChartFrame,
  HearstCourbeChart,
  ReserveExpositionChart,
  type PosteBitcoin,
} from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { figureDepuisResolu } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import { seriesStateFrom } from '@/lib/serie-etat'
import { editorial } from '@/lib/vaults/model'
import {
  CircleStackIcon,
  CpuChipIcon,
  SignalIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

const MINING_ENDPOINT = '/api/v1/mining'
const BTC_ENDPOINT = '/api/v1/btc'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

/**
 * Consolidated product view — top-level blocks.
 * Sources: mining, btc, product-factsheet, backtest-historical.
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

const etatDe = seriesStateFrom

function ouRien(texte: string): string | null {
  return texte === '—' ? null : texte
}

function bitcoinProduitDe(totalSats: string | null | undefined): string | null {
  if (totalSats === undefined || totalSats === null) return null
  const nombre = Number(totalSats)
  if (!Number.isFinite(nombre)) return null
  return formatNumber(nombre / 100_000_000, { maximumFractionDigits: 4 })
}

type PosteReserve = { readonly poste: string; readonly montant: number }

function postesReserveExposition(
  reserveUsdc: string | null | undefined,
  expositionUsdc: string | null | undefined,
): readonly PosteReserve[] {
  const postes: PosteReserve[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    postes.push({ poste: 'Reserve', montant: Number(reserveUsdc) / 1_000_000 })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposure', montant: Number(expositionUsdc) / 1_000_000 })
  }
  return postes
}

function pointsCourbeDe(
  courbeBrute: readonly { month: number; bps: number }[] | null | undefined,
): readonly { mois: number; taux: number }[] {
  if (courbeBrute === null || courbeBrute === undefined) return []
  return courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
}

function courbeParametreeDe(points: readonly { mois: number; taux: number }[]): boolean {
  return points.some((p) => p.taux !== 0)
}

function explicationCourbe(
  points: readonly { mois: number; taux: number }[],
  courbeParametree: boolean,
  vendingCurve: Resolu<unknown> | undefined,
): string {
  if (points.length === 0) {
    const etat = etatDe(vendingCurve, 'Product terms have not been submitted yet.')
    if (etat.type === 'pending' || etat.type === 'unavailable') return etat.explication
    return 'Product terms have not been submitted yet.'
  }
  if (courbeParametree) return 'Curve configured — milestones with non-zero rates.'
  return 'All five product milestones are defined, but no rate has been recorded yet. The curve will appear once they are.'
}

function explicationSerie(champ: Resolu<unknown> | undefined, defaut: string): string {
  const etat = etatDe(champ, defaut)
    if (etat.type === 'pending' || etat.type === 'unavailable') return etat.explication
  return defaut
}

export default async function Page() {
  await requireSession()
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
  const postesGraphique: readonly PosteBitcoin[] = postes.map((p) => ({
    poste: p.poste,
    montant: p.montant,
    accent: p.poste === 'Exposure',
  }))

  const points = pointsCourbeDe(f?.vendingCurve?.value)
  const courbeParametree = courbeParametreeDe(points)
  const plafond = f?.tvlCap?.value

  const lecturesEnAttente: readonly {
    readonly cle: string
    readonly libelle: string
    readonly explication: string
    readonly statut: string | undefined
  }[] = [
    {
      cle: 'backtest',
      libelle: 'Performance vs history',
      explication: explicationSerie(
        backtest.ok ? backtest.data.runs : undefined,
        'No backtest has been run on this deployment yet.',
      ),
      statut: backtest.ok ? backtest.data.runs?.status : undefined,
    },
    {
      cle: 'attribution',
      libelle: 'Yield breakdown',
      explication: explicationSerie(b?.attribution, 'The yield breakdown has not been calculated yet.'),
      statut: b?.attribution?.status,
    },
    {
      cle: 'telemetrie',
      libelle: 'Operational telemetry',
      explication: explicationSerie(
        m?.operationalTelemetry,
        'Operational telemetry has not been submitted yet.',
      ),
      statut: m?.operationalTelemetry?.status,
    },
  ]

  const hashrateCell = figureDepuisResolu(mining.ok ? m?.hashrate : undefined, MINING_ENDPOINT, (h) =>
    formatNumber(Number(h.reportedHashrateTh)),
  )
  const btcProduitCell = figureDepuisResolu(
    btc.ok ? b?.btcProduced : undefined,
    BTC_ENDPOINT,
    (p) => bitcoinProduitDe(p.totalSats) ?? '—',
  )
  const plafondCell = figureDepuisResolu(factsheet.ok ? f?.tvlCap : undefined, FACTSHEET_ENDPOINT, (c) =>
    formatCurrency(c, { decimals: 0 }),
  )

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'hashrate', title: 'Hashrate', value: hashrateCell, unit: 'TH/s', icon: CpuChipIcon },
    { id: 'btc-produced', title: 'BTC produced', value: btcProduitCell, unit: 'BTC', icon: CircleStackIcon },
    { id: 'cap', title: 'Cap', value: plafondCell, icon: Square3Stack3DIcon },
    {
      id: 'source-btc',
      title: 'BTC source',
      value: editorial(b === null ? 'Unavailable' : 'Reachable'),
      icon: SignalIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Consolidated product view"
        description="Mining, BTC, and product factsheet readings — no invented values."
        kpis={kpis}
      />

      <SectionCard title="Production" eyebrow="Fund" hint="Reported hashrate and figures that qualify it.">
        <DescriptionList>
          <DescriptionTerm>Reported hashrate</DescriptionTerm>
          <DescriptionDetails>
            {hashrate ? `${formatNumber(Number(hashrate.reportedHashrateTh))} TH/s` : '—'}
          </DescriptionDetails>
          <DescriptionTerm>BTC produced</DescriptionTerm>
          <DescriptionDetails>{bitcoinProduit === null ? '—' : `${bitcoinProduit} BTC`}</DescriptionDetails>
          <DescriptionTerm>Monthly electricity cost</DescriptionTerm>
          <DescriptionDetails>
            {ouRien(formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 })) ?? '—'}
          </DescriptionDetails>
          <DescriptionTerm>Fund cap</DescriptionTerm>
          <DescriptionDetails>
            {plafond ? (ouRien(formatCurrency(plafond, { decimals: 0 })) ?? '—') : '—'}
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>

      <SectionCard
        title="Where is the fund's capital?"
        eyebrow="Reserve and yield"
        hint="The two readings the product is actually measured on today."
      >
        {postes.length === 0 ? (
          <Callout tone="warning">Neither reserve nor exposure could be read on-chain.</Callout>
        ) : seulPoste !== undefined ? (
          <>
            <DescriptionList>
              <DescriptionTerm>{seulPoste.poste}</DescriptionTerm>
              <DescriptionDetails>
                {formatCurrency(seulPoste.montant, { fromAtomic: 1, decimals: 0 })}
              </DescriptionDetails>
            </DescriptionList>
            <Callout tone="info" className="mt-4">
              The other position could not be read on-chain. Only one of the two positions is readable — reserve and
              exposure cannot be compared yet.
            </Callout>
          </>
        ) : (
          <>
            <ChartFrame
              question="Where is the fund's capital?"
              unite="in dollars — idle reserve vs exposed value"
              etat={{ type: 'plotted' }}
            >
              <ReserveExpositionChart postes={postesGraphique} />
            </ChartFrame>
            <DataTableShell
              title="Capital allocation"
              description="Reserve and exposure read on-chain — the exact figures the chart positions."
              count={`${postes.length} positions`}
              className="mt-6"
            >
              <TableHead>
                <TableRow>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>Amount (USD)</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {postes.map((p) => (
                  <TableRow key={p.poste}>
                    <TableCell className="font-medium">{p.poste}</TableCell>
                    <TableCell>{formatCurrency(p.montant, { fromAtomic: 1, decimals: 0 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="How does yield evolve over time?"
        eyebrow="Reserve and yield"
        hint={explicationCourbe(points, courbeParametree, f?.vendingCurve)}
      >
        <ChartFrame
          question="How does yield evolve over time?"
          unite="as a percentage, per product milestone"
          etat={
            !factsheet.ok
              ? {
                  type: 'unavailable',
                  explication: 'The product factsheet did not respond — the yield curve cannot be read.',
                }
              : !courbeParametree
                ? {
                    type: 'pending',
                    explication: 'The yield curve is not configured yet.',
                  }
                : { type: 'plotted' }
          }
        >
          <HearstCourbeChart points={points} />
        </ChartFrame>
        {points.length > 0 ? (
          <DataTableShell
            title="Yield curve"
            description="Rate recorded per milestone — the exact figures the curve positions."
            count={`${points.length} milestones`}
            className="mt-6"
          >
            <TableHead>
              <TableRow>
                <TableHeader>Month</TableHeader>
                <TableHeader>Rate %</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {points.map((p) => (
                <TableRow key={p.mois}>
                  <TableCell>{formatNumber(p.mois)}</TableCell>
                  <TableCell>{formatNumber(p.taux, { maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        ) : (
          <Text>No readable milestones for now.</Text>
        )}
      </SectionCard>

      <DataTableShell
        title="Not measurable yet"
        description="Three views whose question, axis, and unit are already decided. None charts until the service provides its series — the displayed state is what the source announces."
        count={`${lecturesEnAttente.length} readings`}
      >
        <TableHead>
          <TableRow>
            <TableHeader>Reading</TableHeader>
            <TableHeader>Why it does not appear yet</TableHeader>
            <TableHeader>Source state</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {lecturesEnAttente.map((lecture) => (
            <TableRow key={lecture.cle}>
              <TableCell className="font-medium">{lecture.libelle}</TableCell>
              <TableCell className="text-zinc-500">{lecture.explication}</TableCell>
              <TableCell>
                {lecture.statut ? etatSourceLisible(lecture.statut) : 'Not reported'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  )
}
