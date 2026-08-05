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
import { formatNumber } from '@/lib/format'
import {
  adresseCourte,
  dateLisible,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import { editorial, mapAvailability, measuredCount, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Journal Series 1' }
export const dynamic = 'force-dynamic'

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber?: string | null
  readonly txHash?: string | null
  readonly investorAddress?: string | null
  readonly assetAmountAtomic?: string | null
  readonly shareAmountAtomic?: string | null
  readonly occurredAt?: string | null
}

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type ReponseEvenements = { readonly events?: Resolu<readonly Mouvement[]> }

const estFinancier = (m: Mouvement): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

/**
 * Journal Série 1 — Catalyst pur. Endpoint : series1-events.
 */
export default async function Page() {
  await requireSession()
  const reponse = await callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } })
  const bloc = reponse.ok ? reponse.data.events : undefined
  const mouvements = bloc?.value

  const eventsAvail = availabilityFromResolu<readonly Mouvement[]>(bloc, '/api/v1/series1/events')
  const movementCount = measuredCount(eventsAvail)
  const financialCount = measuredCount(mapAvailability(eventsAvail, (list) => list.filter(estFinancier)))
  const typesCount = mapAvailability(eventsAvail, (list) => String(new Set(list.map((m) => m.eventName)).size))
  const last = mouvements?.[0]?.occurredAt ?? null
  const readable = mouvements !== null && mouvements !== undefined

  const parNature = new Map<string, number>()
  if (readable) {
    for (const m of mouvements) {
      const nom = libelleMouvement(m.eventName)
      const vu = parNature.get(nom)
      parNature.set(nom, vu === undefined ? 1 : vu + 1)
    }
  }
  const repartition = [...parNature.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Journal Série 1"
        description="Journal chronologique de la chaîne — chaque ligne est une écriture du backend, sans total inter-types."
      />

      <DescriptionList>
        <DescriptionTerm>Mouvements</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={movementCount} />
        </DescriptionDetails>
        <DescriptionTerm>Écritures financières</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={financialCount} />
        </DescriptionDetails>
        <DescriptionTerm>Dernier</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading
            value={
              readable
                ? editorial(ilYA(last))
                : unavailable({
                    endpoint: '/api/v1/series1/events',
                    status: 'UNAVAILABLE',
                    reason: 'events_source_unreachable',
                  })
            }
          />
        </DescriptionDetails>
        <DescriptionTerm>Types</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={typesCount} />
        </DescriptionDetails>
        <DescriptionTerm>État de la source</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="Que s’est-il passé ?" description="Du plus récent au plus ancien." />
      {!reponse.ok ? (
        <Text>
          Le journal des mouvements n’a pas pu être lu. Aucun mouvement n’est supposé : une liste vide se lirait à tort
          comme « rien ne s’est passé ».
        </Text>
      ) : !readable || mouvements.length === 0 ? (
        <Text>
          Aucun mouvement enregistré à ce jour
          {motifLisible(bloc?.reason) ? ` : ${motifLisible(bloc?.reason)}` : ' : la chaîne n’a encore rien déposé pour ce fonds'}
          . Ce n’est pas une panne.
        </Text>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Événement</TableHeader>
              <TableHeader>Montant</TableHeader>
              <TableHeader>Détail</TableHeader>
              <TableHeader>Quand</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {mouvements.map((m) => {
              const investisseur = adresseCourte(m.investorAddress)
              const blocNum = m.blockNumber
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{phraseMouvement(m.eventName)}</TableCell>
                  <TableCell>{estFinancier(m) ? montantUsdc(m.assetAmountAtomic) : '—'}</TableCell>
                  <TableCell className="text-zinc-500">
                    {investisseur !== null ? (
                      <span className="font-mono">{investisseur}</span>
                    ) : null}
                    {blocNum !== null && blocNum !== undefined && blocNum !== '' ? (
                      <span className={investisseur !== null ? ' ml-2' : undefined}>
                        bloc {formatNumber(Number(blocNum))}
                      </span>
                    ) : null}
                    {investisseur === null && (blocNum === null || blocNum === undefined || blocNum === '')
                      ? '—'
                      : null}
                  </TableCell>
                  <TableCell title={dateLisible(m.occurredAt)}>{ilYA(m.occurredAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {repartition.length > 0 ? (
        <>
          <AdminSectionHeading title="De quoi ce journal est-il fait ?" />
          <DescriptionList>
            {repartition.map(([nom, nombre]) => (
              <div key={nom} className="contents">
                <DescriptionTerm>{nom}</DescriptionTerm>
                <DescriptionDetails>{formatNumber(nombre)}</DescriptionDetails>
              </div>
            ))}
          </DescriptionList>
        </>
      ) : null}
    </div>
  )
}
