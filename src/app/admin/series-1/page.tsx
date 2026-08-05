import { AdminPageHeader } from '@/components/admin/page-header'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { ChartFrame, HearstActivityChart, MuiDistributionChart } from '@/components/charts'
import { DataTableShell, StatCard, StatGrid } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
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
import {
  editorial,
  isAvailable,
  mapAvailability,
  measuredCount,
  unavailable,
  type Availability,
} from '@/lib/vaults/model'
import { movementCountTrend } from '@/lib/vaults/overview'
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
 * Journal Série 1 — blocs de composition. Endpoint : series1-events.
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

  const lastCell: Availability<string> = readable
    ? editorial(ilYA(last))
    : unavailable({
        endpoint: '/api/v1/series1/events',
        status: 'UNAVAILABLE',
        reason: 'events_source_unreachable',
      })

  const parNature = new Map<string, number>()
  if (readable) {
    for (const m of mouvements) {
      const nom = libelleMouvement(m.eventName)
      const vu = parNature.get(nom)
      parNature.set(nom, vu === undefined ? 1 : vu + 1)
    }
  }
  const repartition = [...parNature.entries()].sort((a, b) => b[1] - a[1])
  const distributionItems = repartition.map(([label, value]) => ({ label, value }))

  // Tendance d'activité : un compte de mouvements par jour, dérivé du seul
  // `occurredAt` réel (aucune dénomination lue ici — les lignes couvrent des
  // types d'actifs aux décimales différentes). En dessous de deux jours
  // ordonnés, une absence nommée, jamais un point unique présenté en pente.
  const trend = movementCountTrend(eventsAvail)
  const trendPoints = isAvailable(trend) ? trend.value : []
  const etatTrend = reponse.ok
    ? ({ type: 'tracee' } as const)
    : ({
        type: 'indisponible',
        explication: 'L’activité par période n’a pas pu être lue.',
      } as const)

  const journalCalme = !reponse.ok
    ? 'Le journal des mouvements n’a pas pu être lu. Aucun mouvement n’est supposé : une liste vide se lirait à tort comme « rien ne s’est passé ».'
    : !readable || mouvements.length === 0
      ? `Aucun mouvement enregistré à ce jour${
          motifLisible(bloc?.reason)
            ? ` : ${motifLisible(bloc?.reason)}`
            : ' : la chaîne n’a encore rien déposé pour ce fonds'
        }. Ce n’est pas une panne.`
      : undefined

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Journal Série 1"
        description="Journal chronologique de la chaîne — chaque ligne est une écriture du backend, sans total inter-types."
      />

      <StatGrid label="Indicateurs du journal Série 1" columns={3}>
        <StatCard titre="Mouvements" valeur={movementCount} showRoute />
        <StatCard titre="Écritures financières" valeur={financialCount} showRoute />
        <StatCard titre="Dernier" valeur={lastCell} showRoute />
        <StatCard titre="Types" valeur={typesCount} showRoute />
        <StatCard titre="État de la source" valeur={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} />
      </StatGrid>

      <DataTableShell title="Que s’est-il passé ?" description="Du plus récent au plus ancien." calme={journalCalme}>
        <TableHead>
          <TableRow>
            <TableHeader>Événement</TableHeader>
            <TableHeader>Montant</TableHeader>
            <TableHeader>Détail</TableHeader>
            <TableHeader>Quand</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {(readable ? mouvements : []).map((m) => {
            const investisseur = adresseCourte(m.investorAddress)
            const blocNum = m.blockNumber
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{phraseMouvement(m.eventName)}</TableCell>
                <TableCell>{estFinancier(m) ? montantUsdc(m.assetAmountAtomic) : '—'}</TableCell>
                <TableCell className="text-zinc-500">
                  {investisseur !== null ? <span className="font-mono">{investisseur}</span> : null}
                  {blocNum !== null && blocNum !== undefined && blocNum !== '' ? (
                    <span className={investisseur !== null ? 'ml-2' : undefined}>
                      bloc {formatNumber(Number(blocNum))}
                    </span>
                  ) : null}
                  {investisseur === null && (blocNum === null || blocNum === undefined || blocNum === '') ? '—' : null}
                </TableCell>
                <TableCell title={dateLisible(m.occurredAt)}>{ilYA(m.occurredAt)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </DataTableShell>

      <ChartFrame
        question="À quel rythme les mouvements arrivent-ils ?"
        unite="nombre de mouvements, par jour observé"
        etat={etatTrend}
      >
        <HearstActivityChart points={trendPoints} unite="mouvements" />
      </ChartFrame>

      <ChartFrame
        question="De quoi ce journal est-il fait ?"
        unite="nombre de mouvements, par type"
        etat={
          !readable
            ? { type: 'indisponible', explication: 'La lecture du journal des mouvements n’a pas abouti.' }
            : { type: 'tracee' }
        }
      >
        <MuiDistributionChart items={distributionItems} />
      </ChartFrame>
    </div>
  )
}
