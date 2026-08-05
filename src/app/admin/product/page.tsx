import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
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
import { availabilityFromResolu } from '@/lib/backend/availability'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import { allocationLisible, comptePoches } from '@/lib/vaults/pockets'
import { editorial, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fiche produit' }
export const dynamic = 'force-dynamic'

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Pocket = {
  readonly pocket?: string | null
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
}

type Terms = {
  readonly productDurationMonths?: number | null
  readonly minimumDepositUsdc?: string | null
  readonly allocation?: { readonly pockets?: readonly Pocket[] | null } | null
}

type Factsheet = {
  readonly terms?: Resolved<Terms>
  readonly tvlCap?: Resolved<string | number>
  readonly vendingCurve?: Resolved<readonly { month: number; bps: number }[]>
}

const PAGE_REASONS = {
  ...MOTIF_SERIE,
  dynavault_not_deployed: 'ces conditions ne sont pas encore disponibles sur le contrat déployé',
}

const DRIFT_THRESHOLD_POINTS = 5

function readableDuration(months: number | null | undefined): string {
  if (months === null || months === undefined || !Number.isFinite(months)) return '—'
  if (months <= 0) return 'Aucune durée fixe'
  return `${formatNumber(months)} mois`
}

function readableShare(bps: number | null | undefined): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
}

function readableVariance(target: number | null, actual: number | null): string {
  if (target === null || actual === null) return '—'
  const pts = (actual - target) / 100
  return `${formatNumber(pts, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
}

function curveExplanation(
  points: readonly { mois: number; taux: number }[],
  curveConfigured: boolean,
  vendingCurve: Resolved<unknown> | undefined,
): string {
  if (points.length === 0) {
    const etat = etatSerieDe(vendingCurve, 'Les conditions de rémunération n’ont pas encore été transmises.', PAGE_REASONS)
    if (etat.type === 'attendue' || etat.type === 'indisponible') return etat.explication
    return 'Les conditions de rémunération n’ont pas encore été transmises.'
  }
  if (curveConfigured) return 'Courbe configurée — jalons avec taux non nuls.'
  return 'Les cinq jalons du produit sont définis, mais aucun taux n’a encore été enregistré. La courbe s’affichera dès qu’ils le seront.'
}

/**
 * Fiche produit — Catalyst pur. Endpoint : product-factsheet.
 */
export default async function Page() {
  await requireSession()
  const response = await callBackend<Factsheet>('product-factsheet')
  const f = response.ok ? response.data : null

  const terms = f?.terms?.value
  const cap = f?.tvlCap?.value
  const rawPockets = terms?.allocation?.pockets
  const pockets = rawPockets ?? []
  const readablePockets = pockets.filter(allocationLisible)

  const rawCurve = f?.vendingCurve?.value
  const points =
    rawCurve === null || rawCurve === undefined
      ? []
      : rawCurve.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const curveConfigured = points.some((p) => p.taux !== 0)

  const factsheetUnreadable = unavailable({
    endpoint: '/api/v1/product/factsheet',
    status: 'UNAVAILABLE',
    reason: 'product_factsheet_unreachable',
  })
  const pocketsCell: Availability<string> = comptePoches(response.ok, f?.terms)
  const curveCell = mapAvailability(
    availabilityFromResolu(f?.vendingCurve, '/api/v1/product/factsheet'),
    (curve) => String(curve.length),
  )
  const figure = (value: string): Availability<string> => (response.ok ? editorial(value) : factsheetUnreadable)

  const allocationSource = readablePockets.length > 0
    ? 'Poches lisibles'
    : pockets.length === 0
      ? 'Aucune poche déclarée par la source'
      : 'Poches déclarées, aucune allocation lisible'

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Fiche produit"
        description="Conditions de souscription, courbe de rémunération et allocation cible — telles que le service les expose."
      />

      <DescriptionList>
        <DescriptionTerm>Dépôt minimum</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={figure(formatCurrency(terms?.minimumDepositUsdc, { decimals: 0 }))} />
        </DescriptionDetails>
        <DescriptionTerm>Durée</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={figure(readableDuration(terms?.productDurationMonths))} />
        </DescriptionDetails>
        <DescriptionTerm>Plafond du fonds</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={figure(formatCurrency(cap, { decimals: 0 }))} />
        </DescriptionDetails>
        <DescriptionTerm>Poches</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={pocketsCell} />
        </DescriptionDetails>
        <DescriptionTerm>Jalons de courbe</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={curveCell} />
        </DescriptionDetails>
        <DescriptionTerm>Courbe de rémunération</DescriptionTerm>
        <DescriptionDetails>{curveConfigured ? 'Configurée' : 'En attente'}</DescriptionDetails>
        <DescriptionTerm>Source d’allocation</DescriptionTerm>
        <DescriptionDetails>{allocationSource}</DescriptionDetails>
      </DescriptionList>

      {f === null ? (
        <Text>
          La fiche produit n’a pas pu être lue. Aucune condition n’est affichée plutôt que d’en montrer d’obsolètes.
        </Text>
      ) : (
        <>
          <AdminSectionHeading title="Courbe de rémunération" />
          <Text>{curveExplanation(points, curveConfigured, f.vendingCurve)}</Text>
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
            title="Allocation cible"
            description="Cible vs constaté par poche. Une poche sans cible lisible n’est pas inventée à zéro."
          />
          {readablePockets.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Poche</TableHeader>
                  <TableHeader>Cible</TableHeader>
                  <TableHeader>Constaté</TableHeader>
                  <TableHeader>Écart</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {readablePockets.map((p, index) => {
                  const target = Number(p.targetBps)
                  const actual =
                    p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
                      ? null
                      : p.actualBps
                  const label =
                    p.label === null || p.label === undefined || p.label === ''
                      ? (p.pocket ?? 'Poche sans nom')
                      : p.label
                  const drift =
                    target !== null && actual !== null
                      ? Math.abs((actual - target) / 100) >= DRIFT_THRESHOLD_POINTS
                      : false
                  return (
                    <TableRow key={p.pocket ?? p.label ?? String(index)}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>{readableShare(target)}</TableCell>
                      <TableCell>{readableShare(actual)}</TableCell>
                      <TableCell className={drift ? 'text-amber-600 dark:text-amber-400' : undefined}>
                        {readableVariance(target, actual)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Text>
              Aucun solde de poche n’a pu être lu on-chain. Rien n’est tracé, plutôt qu’une répartition mise à zéro.
            </Text>
          )}
        </>
      )}
    </div>
  )
}
