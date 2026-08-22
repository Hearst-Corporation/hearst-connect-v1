import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Series1EventExplorer, type Series1EventRow } from '@/components/admin/series-1-event-explorer'
import {
  ChartFrame,
  HearstActivityChart,
  RichDistributionChart,
  type DistributionItem,
  type SeriesState,
} from '@/components/charts'
import { requireSession } from '@/lib/auth'
import { availabilityFromResolved } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
import {
  adresseCourte,
  movementLabel,
  readableReason,
} from '@/lib/movements'
import { formatEventAtomic, type AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { loadAdminAssetScale } from '@/lib/admin-dashboard/load'
import {
  editorial,
  isAvailable,
  mapAvailability,
  measuredCount,
  vaultId,
  type Availability,
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

type Series1Event = {
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

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type ReponseEvenements = { readonly events?: Resolved<readonly Series1Event[]> }

const estFinancier = (m: Series1Event): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

function ligneEvenement(m: Series1Event, scale: AdminAssetScale | null): Series1EventRow {
  const resolvedVaultId = vaultId(m.chainId, m.contractAddress)
  // Amounts are formatted only with the measured asset scale — never an
  // assumed 6dp, never an invented asset label.
  const financial = estFinancier(m) && scale !== null
  return {
    id: m.id,
    eventName: m.eventName,
    vaultId: resolvedVaultId,
    client: adresseCourte(m.investorAddress),
    amount: financial ? formatEventAtomic(m.assetAmountAtomic ?? null, scale.asset, scale) : null,
    assetLabel: null,
    txHash: m.txHash ?? null,
    blockNumber: m.blockNumber ?? null,
    occurredAt: m.occurredAt ?? null,
    indexedAt: m.indexedAt ?? null,
  }
}

function repartitionParNature(movements: readonly Series1Event[]): readonly DistributionItem[] {
  const parNature = new Map<string, number>()
  for (const m of movements) {
    const name = movementLabel(m.eventName)
    const vu = parNature.get(name)
    parNature.set(name, vu === undefined ? 1 : vu + 1)
  }
  return [...parNature.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
}

function trendChartState(reponseOk: boolean, trendPointCount: number): SeriesState {
  if (!reponseOk) {
    return { type: 'unavailable', explanation: 'Activity by period could not be read.' }
  }
  if (trendPointCount < 2) {
    return {
      type: 'empty',
      explanation:
        'Fewer than two days of measured activity — a trend is not plotted from a single point. The explorer below remains the faithful read.',
    }
  }
  return { type: 'plotted' }
}

function breakdownChartState(readable: boolean, distributionItems: readonly DistributionItem[]): SeriesState {
  if (!readable) {
    return { type: 'unavailable', explanation: 'The movement ledger read did not succeed.' }
  }
  if (distributionItems.length === 0) {
    return { type: 'empty', explanation: 'No movement to distribute for now.' }
  }
  return { type: 'plotted' }
}

function messageJournalCalme(
  reponseOk: boolean,
  readable: boolean,
  movements: readonly Series1Event[] | null | undefined,
  reason?: string | null,
): string | undefined {
  if (!reponseOk) {
    return 'The movement ledger could not be read. No movement is assumed — an empty list would wrongly read as nothing happened.'
  }
  if (!readable || movements === null || movements === undefined || movements.length === 0) {
    const motif = readableReason(reason)
    if (motif) {
      return `No movement recorded to date: ${motif}. This is not an outage.`
    }
    return 'No movement recorded to date — the chain has not deposited anything for this fund yet. This is not an outage.'
  }
  return undefined
}

function serie1Kpis(
  reponseOk: boolean,
  movementCount: Availability<string>,
  financialCount: Availability<string>,
  typesCount: Availability<string>,
): readonly AdminHeroKpi[] {
  return [
    {
      id: 'source',
      title: 'Source status',
      value: editorial(reponseOk ? 'Reachable' : 'Unavailable'),
      icon: SignalIcon,
    },
    { id: 'movements', title: 'Movements', value: movementCount, icon: ArrowsRightLeftIcon },
    { id: 'financial', title: 'Financial entries', value: financialCount, icon: BanknotesIcon },
    { id: 'types', title: 'Distinct types', value: typesCount, icon: Squares2X2Icon },
  ]
}

/**
 * Series 1 journal — operational event explorer. Endpoint: series1-events.
 */
export default async function Page() {
  await requireSession()
  const [reponse, assetScale] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } }),
    loadAdminAssetScale(),
  ])
  const bloc = reponse.ok ? reponse.data.events : undefined
  const movements = bloc?.value

  const eventsAvail = availabilityFromResolved<readonly Series1Event[]>(bloc, '/api/v1/series1/events')
  const movementCount = measuredCount(eventsAvail)
  const financialCount = measuredCount(mapAvailability(eventsAvail, (list) => list.filter(estFinancier)))
  const typesCount = mapAvailability(eventsAvail, (list) => String(new Set(list.map((m) => m.eventName)).size))
  const readable = movements !== null && movements !== undefined
  const distributionItems = readable ? repartitionParNature(movements) : []

  const trend = movementCountTrend(eventsAvail)
  const trendPoints = isAvailable(trend) ? trend.value : []
  const trendState = trendChartState(reponse.ok, trendPoints.length)
  const breakdownState = breakdownChartState(readable, distributionItems)
  const journalCalme = messageJournalCalme(reponse.ok, readable, movements, bloc?.reason)
  const rows = readable ? movements.map((m) => ligneEvenement(m, assetScale)) : []
  const kpis = serie1Kpis(reponse.ok, movementCount, financialCount, typesCount)

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Series 1 journal"
        description="Operational event explorer for indexed Series 1 — source /api/v1/series1/events only."
        kpis={kpis}
      />

      {/* Chart pair — symmetric spans, same compact viewport: equal heights. */}
      <BentoGrid>
        <BentoCard span={6}>
          <ChartFrame
            question="How fast do movements arrive?"
            unit="number of movements, per observed day"
            state={trendState}
            viewport="compact"
          >
            <HearstActivityChart points={trendPoints} unit="movements" viewport="compact" />
          </ChartFrame>
        </BentoCard>
        <BentoCard span={6}>
          <ChartFrame
            question="What is this journal made of?"
            unit="number of movements, by type"
            state={breakdownState}
            viewport="compact"
          >
            <RichDistributionChart items={distributionItems} unit="movements" />
          </ChartFrame>
        </BentoCard>
      </BentoGrid>

      {/* Explorer — full-width band. */}
      <BentoGrid>
        <BentoCard span={12}>
          <Series1EventExplorer rows={rows} calme={journalCalme} />
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
