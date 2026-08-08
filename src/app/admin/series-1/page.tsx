import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { ChartFrame, HearstActivityChart, RichDistributionChart, type DistributionItem } from '@/components/charts'
import { DataTableShell, SectionCard } from '@/components/compositions'
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
} from '@/lib/vaults/model'
import { movementCountTrend } from '@/lib/vaults/overview'
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  SignalIcon,
  Squares2X2Icon,
} from '@heroicons/react/16/solid'
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
  'Balance and net asset value per investor — not exposed by this event stream',
  'Cross-type total: impossible — rows cover assets with different decimals',
  'On-chain ↔ registry reconciliation: backend work, not in this console',
] as const

/**
 * Series 1 journal — blocs de composition. Endpoint : series1-events.
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
  const distributionItems: readonly DistributionItem[] = repartition.map(([label, value]) => ({ label, value }))

  // Activity trend: movement count per day, derived only from real
  // `occurredAt` réel (aucune dénomination lue ici — les lignes couvrent des
  // types d'actifs aux décimales différentes). En dessous de deux jours
  // ordonnés, une absence nommée, jamais un point unique présenté en pente.
  const trend = movementCountTrend(eventsAvail)
  const trendPoints = isAvailable(trend) ? trend.value : []
  const etatTrend = !reponse.ok
    ? ({ type: 'unavailable', explication: 'Activity by period could not be read.' } as const)
    : trendPoints.length < 2
      ? ({
          type: 'empty',
          explication:
            'Fewer than two days of measured activity — a trend is not plotted from a single point. The journal below remains the faithful read.',
        } as const)
      : ({ type: 'plotted' } as const)

  const etatRepartition = !readable
    ? ({ type: 'unavailable', explication: 'The movement ledger read did not succeed.' } as const)
    : distributionItems.length === 0
      ? ({ type: 'empty', explication: 'No movement to distribute for now.' } as const)
      : ({ type: 'plotted' } as const)

  const journalCalme = !reponse.ok
    ? 'The movement ledger could not be read. No movement is assumed — an empty list would wrongly read as nothing happened.'
    : !readable || mouvements.length === 0
      ? `No movement recorded to date${
          motifLisible(bloc?.reason)
            ? ` : ${motifLisible(bloc?.reason)}`
            : ' — the chain has not deposited anything for this fund yet'
        }. This is not an outage.`
      : undefined

  const journalCount = readable && mouvements.length > 0 ? `${formatNumber(mouvements.length)} movements` : undefined

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'source',
      title: 'Status source',
      value: editorial(reponse.ok ? 'Reachable' : 'Unavailable'),
      icon: SignalIcon,
    },
    { id: 'movements', title: 'Movements', value: movementCount, icon: ArrowsRightLeftIcon },
    { id: 'financial', title: 'Financial entries', value: financialCount, icon: BanknotesIcon },
    { id: 'types', title: 'Distinct types', value: typesCount, icon: Squares2X2Icon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Series 1 journal"
        description="Indexed Series 1 events — source /api/v1/series1/events only."
        kpis={kpis}
      />

      <ChartFrame
        question="How fast do movements arrive?"
        unite="number of movements, per observed day"
        etat={etatTrend}
      >
        <HearstActivityChart points={trendPoints} unite="movements" />
      </ChartFrame>

      <ChartFrame
        question="What is this journal made of?"
        unite="number of movements, by type"
        etat={etatRepartition}
      >
        <RichDistributionChart items={distributionItems} unit="movements" />
      </ChartFrame>

      <DataTableShell
        title="What happened?"
        description="Journal from newest to oldest — source /api/v1/series1/events only."
        count={journalCount}
        calme={journalCalme}
      >
        {readable && mouvements.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Event</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Detail</TableHeader>
                <TableHeader>When</TableHeader>
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

      <SectionCard title="Missing at source" hint="UI definition — not counters." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {MANQUANT_A_LA_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
