import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu, figureDepuisResolu } from '@/lib/backend/availability'
import { formatCurrency, formatNumber } from '@/lib/format'
import { etatSerieDe } from '@/lib/serie-etat'
import { editorial, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'

const MINING_ENDPOINT = '/api/v1/mining'
const BTC_ENDPOINT = '/api/v1/btc'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vue produit consolidée' }
export const dynamic = 'force-dynamic'

/**
 * Vue produit consolidée — Catalyst pur.
 * Sources : mining, btc, product-factsheet, backtest-historical.
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
    postes.push({ poste: 'Réserve', montant: Number(reserveUsdc) / 1_000_000 })
  }
  if (expositionUsdc !== null && expositionUsdc !== undefined && Number.isFinite(Number(expositionUsdc))) {
    postes.push({ poste: 'Exposition', montant: Number(expositionUsdc) / 1_000_000 })
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
    const etat = etatDe(vendingCurve, 'Les conditions du produit n’ont pas encore été transmises.')
    if (etat.type === 'attendue' || etat.type === 'indisponible') return etat.explication
    return 'Les conditions du produit n’ont pas encore été transmises.'
  }
  if (courbeParametree) return 'Courbe configurée — jalons avec taux non nuls.'
  return 'Les cinq échéances du produit sont définies, mais aucun taux n’a encore été enregistré. La courbe apparaîtra dès qu’ils le seront.'
}

function explicationSerie(
  champ: Resolu<unknown> | undefined,
  defaut: string,
): string {
  const etat = etatDe(champ, defaut)
  if (etat.type === 'attendue' || etat.type === 'indisponible') return etat.explication
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

  const points = pointsCourbeDe(f?.vendingCurve?.value)
  const courbeParametree = courbeParametreeDe(points)
  const plafond = f?.tvlCap?.value

  const reserveAvail = availabilityFromResolu(btc.ok ? b?.reserve : undefined, '/api/v1/btc')
  const exposureAvail = availabilityFromResolu(btc.ok ? b?.exposure : undefined, '/api/v1/btc')
  const reserveSplitCell: Availability<string> = (() => {
    if (!btc.ok) {
      return unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
    }
    const postes = postesReserveExposition(b?.reserve?.value?.balanceUsdc, b?.exposure?.value?.valueUsdc)
    if (
      postes.length === 0 &&
      b?.reserve?.value?.balanceUsdc === undefined &&
      b?.exposure?.value?.valueUsdc === undefined
    ) {
      return unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'reserve_and_exposure_unreadable' })
    }
    const reserveReadable = reserveAvail.kind === 'available'
    const exposureReadable = exposureAvail.kind === 'available'
    if (!reserveReadable && !exposureReadable) {
      return unavailable({ endpoint: '/api/v1/btc', status: 'PARTIAL', reason: 'reserve_and_exposure_unreadable' })
    }
    return mapAvailability(reserveAvail, () => String(postes.length))
  })()
  const curvePointsCell = mapAvailability(
    availabilityFromResolu(factsheet.ok ? f?.vendingCurve : undefined, FACTSHEET_ENDPOINT),
    (curve) => String(pointsCourbeDe(curve).length),
  )
  const hashrateCell = figureDepuisResolu(
    mining.ok ? m?.hashrate : undefined,
    MINING_ENDPOINT,
    (h) => formatNumber(Number(h.reportedHashrateTh)),
  )
  const btcProduitCell = figureDepuisResolu(
    btc.ok ? b?.btcProduced : undefined,
    BTC_ENDPOINT,
    (p) => bitcoinProduitDe(p.totalSats) ?? '—',
  )
  const plafondCell = figureDepuisResolu(
    factsheet.ok ? f?.tvlCap : undefined,
    FACTSHEET_ENDPOINT,
    (c) => formatCurrency(c, { decimals: 0 }),
  )

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Vue produit consolidée"
        description="Production du fonds, répartition du capital, évolution de la rémunération et lectures encore absentes — six anciennes pages en une seule surface."
      />

      <DescriptionList>
        <DescriptionTerm>Hashrate</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={hashrateCell} />
        </DescriptionDetails>
        <DescriptionTerm>BTC produit</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={btcProduitCell} />
        </DescriptionDetails>
        <DescriptionTerm>Répartition de la réserve</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={reserveSplitCell} />
        </DescriptionDetails>
        <DescriptionTerm>Points de courbe</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={curvePointsCell} />
        </DescriptionDetails>
        <DescriptionTerm>Plafond du fonds</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={plafondCell} />
        </DescriptionDetails>
        <DescriptionTerm>Source BTC</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(b === null ? 'Indisponible' : 'Joignable')} />
        </DescriptionDetails>
        <DescriptionTerm>Courbe de rémunération</DescriptionTerm>
        <DescriptionDetails>{courbeParametree ? 'Configurée' : 'En attente des taux'}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Production"
        description="Hashrate renseigné et chiffres qui le qualifient."
      />
      <DescriptionList>
        <DescriptionTerm>Hashrate renseigné</DescriptionTerm>
        <DescriptionDetails>
          {hashrate ? `${formatNumber(Number(hashrate.reportedHashrateTh))} TH/s` : '—'}
        </DescriptionDetails>
        <DescriptionTerm>BTC produit</DescriptionTerm>
        <DescriptionDetails>{bitcoinProduit === null ? '—' : `${bitcoinProduit} BTC`}</DescriptionDetails>
        <DescriptionTerm>Coût mensuel d’électricité</DescriptionTerm>
        <DescriptionDetails>
          {ouRien(formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 })) ?? '—'}
        </DescriptionDetails>
        <DescriptionTerm>Plafond du fonds</DescriptionTerm>
        <DescriptionDetails>
          {plafond ? (ouRien(formatCurrency(plafond, { decimals: 0 })) ?? '—') : '—'}
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Réserve et rémunération"
        description="Les deux lectures sur lesquelles le produit est réellement mesuré aujourd’hui."
      />

      <Subheading className="mt-6">Où se trouve l’argent du fonds ?</Subheading>
      {postes.length === 0 ? (
        <Text>Ni la réserve ni l’exposition n’ont pu être lues on-chain.</Text>
      ) : seulPoste !== undefined ? (
        <>
          <DescriptionList>
            <DescriptionTerm>{seulPoste.poste}</DescriptionTerm>
            <DescriptionDetails>
              {formatCurrency(seulPoste.montant, { fromAtomic: 1, decimals: 0 })}
            </DescriptionDetails>
          </DescriptionList>
          <Text className="mt-4">
            L’autre position n’a pas pu être lue on-chain. Une seule des deux positions est lisible — réserve et
            exposition ne peuvent pas encore être comparées.
          </Text>
        </>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Poste</TableHeader>
              <TableHeader>Montant (USD)</TableHeader>
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
        </Table>
      )}

      <Subheading className="mt-10">Comment la rémunération évolue-t-elle dans le temps ?</Subheading>
      <Text>{explicationCourbe(points, courbeParametree, f?.vendingCurve)}</Text>
      {points.length > 0 ? (
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeader>Mois</TableHeader>
              <TableHeader>Taux %</TableHeader>
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
        </Table>
      ) : null}

      <AdminSectionHeading
        title="Pas encore mesurable"
        description="Trois vues dont la question, l’axe et l’unité sont déjà décidés. Aucune ne trace quoi que ce soit tant que le service ne fournit pas sa série."
      />
      <DescriptionList>
        <DescriptionTerm>Performance vs historique</DescriptionTerm>
        <DescriptionDetails>
          {explicationSerie(
            backtest.ok ? backtest.data.runs : undefined,
            'Aucun backtest n’a encore été exécuté sur ce déploiement.',
          )}
        </DescriptionDetails>
        <DescriptionTerm>Ventilation du rendement</DescriptionTerm>
        <DescriptionDetails>
          {explicationSerie(b?.attribution, 'La ventilation du rendement n’a pas encore été calculée.')}
        </DescriptionDetails>
        <DescriptionTerm>Télémétrie opérationnelle</DescriptionTerm>
        <DescriptionDetails>
          {explicationSerie(
            m?.operationalTelemetry,
            'La télémétrie opérationnelle n’a pas encore été transmise.',
          )}
        </DescriptionDetails>
        <DescriptionTerm>Flux de backtest</DescriptionTerm>
        <DescriptionDetails>
          {backtest.ok ? (backtest.data.runs?.status ?? 'Non renseigné') : 'Indisponible'}
        </DescriptionDetails>
        <DescriptionTerm>Attribution</DescriptionTerm>
        <DescriptionDetails>{b?.attribution?.status ?? 'Non renseigné'}</DescriptionDetails>
        <DescriptionTerm>Télémétrie</DescriptionTerm>
        <DescriptionDetails>{m?.operationalTelemetry?.status ?? 'Non renseigné'}</DescriptionDetails>
      </DescriptionList>
    </div>
  )
}
