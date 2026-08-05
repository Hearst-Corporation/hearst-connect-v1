import { AdminPageHeader } from '@/components/admin/page-header'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import {
  ChartFrame,
  HearstCourbeChart,
  ReserveExpositionChart,
  type PosteBitcoin,
} from '@/components/charts'
import { Callout, DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { availabilityFromResolu, figureDepuisResolu } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { etatSerieDe } from '@/lib/serie-etat'
import { editorial, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

const MINING_ENDPOINT = '/api/v1/mining'
const BTC_ENDPOINT = '/api/v1/btc'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'

export const metadata: Metadata = { title: 'Produit' }
export const dynamic = 'force-dynamic'

/**
 * Vue produit consolidée — blocs haut de gamme.
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

function explicationSerie(champ: Resolu<unknown> | undefined, defaut: string): string {
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
  // Même modèle que le jumeau /espace/bitcoin : l'exposition (mesure) porte
  // l'encre, la réserve (référence) le neutre. Aucun montant n'est inventé —
  // c'est une reprojection des mêmes deux postes lus on-chain.
  const postesGraphique: readonly PosteBitcoin[] = postes.map((p) => ({
    poste: p.poste,
    montant: p.montant,
    accent: p.poste === 'Exposition',
  }))

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

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Vue produit consolidée"
        description="Production du fonds, répartition du capital, évolution de la rémunération et lectures encore absentes — six anciennes pages en une seule surface."
      />

      <StatGrid label="Lectures consolidées du produit" columns={3}>
        <StatCard titre="Hashrate" valeur={hashrateCell} showRoute hint="Puissance de calcul renseignée." />
        <StatCard titre="BTC produit" valeur={btcProduitCell} showRoute hint="Bitcoin extrait par le fonds." />
        <StatCard
          titre="Répartition de la réserve"
          valeur={reserveSplitCell}
          showRoute
          hint="Nombre de positions lisibles on-chain."
        />
        <StatCard
          titre="Points de courbe"
          valeur={curvePointsCell}
          showRoute
          hint="Jalons de la courbe de rémunération."
        />
        <StatCard titre="Plafond du fonds" valeur={plafondCell} showRoute hint="Capacité maximale du produit." />
        <StatCard
          titre="Source BTC"
          valeur={editorial(b === null ? 'Indisponible' : 'Joignable')}
          hint={courbeParametree ? 'Courbe de rémunération configurée.' : 'Courbe en attente des taux.'}
        />
      </StatGrid>

      <SectionCard title="Production" eyebrow="Fonds" hint="Hashrate renseigné et chiffres qui le qualifient.">
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
      </SectionCard>

      <SectionCard
        title="Où se trouve l’argent du fonds ?"
        eyebrow="Réserve et rémunération"
        hint="Les deux lectures sur lesquelles le produit est réellement mesuré aujourd’hui."
      >
        {postes.length === 0 ? (
          <Callout tone="warning">Ni la réserve ni l’exposition n’ont pu être lues on-chain.</Callout>
        ) : seulPoste !== undefined ? (
          <>
            <DescriptionList>
              <DescriptionTerm>{seulPoste.poste}</DescriptionTerm>
              <DescriptionDetails>
                {formatCurrency(seulPoste.montant, { fromAtomic: 1, decimals: 0 })}
              </DescriptionDetails>
            </DescriptionList>
            <Callout tone="info" className="mt-4">
              L’autre position n’a pas pu être lue on-chain. Une seule des deux positions est lisible — réserve et
              exposition ne peuvent pas encore être comparées.
            </Callout>
          </>
        ) : (
          <>
            <ChartFrame
              question="Où se trouve l’argent du fonds ?"
              unite="en dollars — réserve dormante contre valeur exposée"
              etat={{ type: 'tracee' }}
            >
              <ReserveExpositionChart postes={postesGraphique} />
            </ChartFrame>
            <DataTableShell
              title="Répartition du capital"
              description="Réserve et exposition lues on-chain — les chiffres exacts que le graphique situe."
              count={`${postes.length} positions`}
              className="mt-6"
            >
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
            </DataTableShell>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Comment la rémunération évolue-t-elle dans le temps ?"
        eyebrow="Réserve et rémunération"
        hint={explicationCourbe(points, courbeParametree, f?.vendingCurve)}
      >
        <ChartFrame
          question="Comment la rémunération évolue-t-elle dans le temps ?"
          unite="en pourcentage, par échéance du produit"
          etat={
            !factsheet.ok
              ? {
                  type: 'indisponible',
                  explication: 'La fiche produit n’a pas répondu — la courbe de rémunération ne peut pas être lue.',
                }
              : !courbeParametree
                ? {
                    type: 'attendue',
                    explication: 'La courbe de rémunération n’est pas encore paramétrée.',
                  }
                : { type: 'tracee' }
          }
        >
          <HearstCourbeChart points={points} />
        </ChartFrame>
        {points.length > 0 ? (
          <DataTableShell
            title="Courbe de rémunération"
            description="Taux enregistré par échéance — les chiffres exacts que la courbe situe."
            count={`${points.length} jalons`}
            className="mt-6"
          >
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
          </DataTableShell>
        ) : (
          <Text>Aucun jalon lisible pour l’instant.</Text>
        )}
      </SectionCard>

      <SectionCard
        title="Pas encore mesurable"
        eyebrow="En attente de série"
        hint="Trois vues dont la question, l’axe et l’unité sont déjà décidés. Aucune ne trace quoi que ce soit tant que le service ne fournit pas sa série."
      >
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
            {explicationSerie(m?.operationalTelemetry, 'La télémétrie opérationnelle n’a pas encore été transmise.')}
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
      </SectionCard>
    </div>
  )
}
