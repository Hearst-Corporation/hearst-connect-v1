import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Series1EventExplorer, type Series1EventRow } from '@/components/admin/series-1-event-explorer'
import { ChartFrame, HearstActivityChart, RichDistributionChart, type DistributionItem } from '@/components/charts'
import { requireSession } from '@/lib/auth'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
import {
  adresseCourte,
  libelleMouvement,
  montantUsdc,
  motifLisible,
} from '@/lib/mouvements'
import {
  editorial,
  isAvailable,
  mapAvailability,
  measuredCount,
  vaultId,
} from '@/lib/vaults/model'
import { movementCountTrend } from '@/lib/vaults/overview'
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  SignalIcon,
  Squares2X2Icon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Series 1 journal' }
export const dynamic = 'force-dynamic'

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly chainId?: number | null
  readonly contractAddress?: string | null
  readonly blockNumber?: string | null
  readonly txHash?: string | null
  readonly investorAddress?: string | null
  readonly assetAmountAtomic?: string | null
  readonly shareAmountAtomic?: string | null
  readonly occurredAt?: string | null
  readonly indexedAt?: string | null
}

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type ReponseEvenements = { readonly events?: Resolu<readonly Mouvement[]> }

const estFinancier = (m: Mouvement): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

function ligneEvenement(m: Mouvement): Series1EventRow {
  const resolvedVaultId = vaultId(m.chainId, m.contractAddress)
  return {
    id: m.id,
    eventName: m.eventName,
    vaultId: resolvedVaultId,
    client: adresseCourte(m.investorAddress),
    amount: estFinancier(m) ? montantUsdc(m.assetAmountAtomic) : null,
    assetLabel: estFinancier(m) ? 'USDC' : null,
    txHash: m.txHash ?? null,
    blockNumber: m.blockNumber ?? null,
    occurredAt: m.occurredAt ?? null,
    indexedAt: m.indexedAt ?? null,
  }
}

/**
 * Series 1 journal — operational event explorer. Endpoint: series1-events.
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

  const trend = movementCountTrend(eventsAvail)
  const trendPoints = isAvailable(trend) ? trend.value : []
  const etatTrend = !reponse.ok
    ? ({ type: 'unavailable', explication: 'Activity by period could not be read.' } as const)
    : trendPoints.length < 2
      ? ({
          type: 'empty',
          explication:
            'Fewer than two days of measured activity — a trend is not plotted from a single point. The explorer below remains the faithful read.',
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

  const rows = readable ? mouvements.map(ligneEvenement) : []

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'source',
      title: 'Source status',
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
        description="Operational event explorer for indexed Series 1 — source /api/v1/series1/events only."
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

      <Series1EventExplorer rows={rows} calme={journalCalme} />
    </div>
  )
}
