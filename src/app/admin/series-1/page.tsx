import { AdminPageHeader } from '@/components/admin/page-header'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { ChartFrame, HearstActivityChart, RichDistributionChart, type DistributionItem } from '@/components/charts'
import { DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
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

const MANQUANT_A_LA_SOURCE = [
  'Solde et valeur nette par investisseur — non exposés par ce flux d’événements',
  'Total inter-types : impossible, les lignes couvrent des actifs aux décimales différentes',
  'Rapprochement on-chain ↔ registre : à faire côté backend, pas dans cette console',
] as const

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
  const distributionItems: readonly DistributionItem[] = repartition.map(([label, value]) => ({ label, value }))

  // Tendance d'activité : un compte de mouvements par jour, dérivé du seul
  // `occurredAt` réel (aucune dénomination lue ici — les lignes couvrent des
  // types d'actifs aux décimales différentes). En dessous de deux jours
  // ordonnés, une absence nommée, jamais un point unique présenté en pente.
  const trend = movementCountTrend(eventsAvail)
  const trendPoints = isAvailable(trend) ? trend.value : []
  const etatTrend = !reponse.ok
    ? ({ type: 'indisponible', explication: 'L’activité par période n’a pas pu être lue.' } as const)
    : trendPoints.length < 2
      ? ({
          type: 'vide',
          explication:
            'Moins de deux jours d’activité mesurés — une tendance ne se trace pas sur un point unique. Le journal ci-dessous reste la lecture fidèle.',
        } as const)
      : ({ type: 'tracee' } as const)

  const etatRepartition = !readable
    ? ({ type: 'indisponible', explication: 'La lecture du journal des mouvements n’a pas abouti.' } as const)
    : distributionItems.length === 0
      ? ({ type: 'vide', explication: 'Aucun mouvement à répartir pour l’instant.' } as const)
      : ({ type: 'tracee' } as const)

  const journalCalme = !reponse.ok
    ? 'Le journal des mouvements n’a pas pu être lu. Aucun mouvement n’est supposé : une liste vide se lirait à tort comme « rien ne s’est passé ».'
    : !readable || mouvements.length === 0
      ? `Aucun mouvement enregistré à ce jour${
          motifLisible(bloc?.reason)
            ? ` : ${motifLisible(bloc?.reason)}`
            : ' : la chaîne n’a encore rien déposé pour ce fonds'
        }. Ce n’est pas une panne.`
      : undefined

  const journalCount = readable && mouvements.length > 0 ? `${formatNumber(mouvements.length)} mouvements` : undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Journal Série 1" />

      <StatGrid label="Indicateurs du journal Série 1" columns={4}>
        <StatCard titre="État de la source" valeur={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} hint="Flux series1-events" />
        <StatCard titre="Mouvements" valeur={movementCount} hint="Écritures dans la fenêtre lue" showRoute />
        <StatCard titre="Écritures financières" valeur={financialCount} hint="Lignes portant un montant" showRoute />
        <StatCard titre="Types distincts" valeur={typesCount} hint="Natures d’événement observées" showRoute />
        <StatCard titre="Dernier mouvement" valeur={lastCell} hint="Écriture la plus récente" showRoute />
      </StatGrid>

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
        etat={etatRepartition}
      >
        <RichDistributionChart items={distributionItems} unit="mouvements" />
      </ChartFrame>

      <DataTableShell
        title="Que s’est-il passé ?"
        description="Journal du plus récent au plus ancien — source /api/v1/series1/events uniquement."
        count={journalCount}
        calme={journalCalme}
      >
        {readable && mouvements.length > 0 ? (
          <>
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
          </>
        ) : null}
      </DataTableShell>

      <SectionCard title="Manquant à la source" hint="Définition UI — pas des compteurs." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {MANQUANT_A_LA_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
