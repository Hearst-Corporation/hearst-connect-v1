import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { BucketSparklines, ChartFrame, HearstAllocationChart, HearstDonutChart, HearstLineChart, VaultAumCbbtcChart, type AllocationItem, type SeriesState } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import { DataTableShell, SectionCard, fitTableColCompact, fitTableColPrimary } from '@/components/compositions'
import clsx from 'clsx'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { libelleStatutVault, VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { requireSession } from '@/lib/auth'
import { explorerTxUrl } from '@/lib/explorer'
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatHash,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format'
import { movementLabel, movementSentence } from '@/lib/movements'
import {
  available,
  combine,
  deployedAtomic,
  editorial,
  idleAtomic,
  isAvailable,
  mapAvailability,
  parseVaultId,
  unavailable,
  type Availability,
  type Movement,
  type RebalancingRow,
  type Unavailable,
  type Vault,
  type VaultId,
} from '@/lib/vaults/model'
import { loadVault } from '@/lib/vaults/registry'
import {
  ArchiveBoxIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const DOCUMENTED_DECIMALS = 6

type PageProps = Readonly<{ params: Promise<{ vaultId: string }> }>

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vaultId } = await params
  const parsed = parseVaultId(vaultId)
  if (parsed === null) return { title: 'Vault' }
  const short = formatAddress(parsed.contractAddress)
  return { title: short === null ? 'Vault' : `Vault ${short}` }
}

function absentReading(source: Unavailable): Availability<string> {
  return unavailable({
    endpoint: source.endpoint,
    status: source.status,
    reason: source.reason,
  })
}

function amountOf(vault: Vault, atomic: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, atomic, (asset, raw) => {
    const formatted = formatCurrency(raw.toString(), { unit: '', fromAtomic: 10 ** asset.decimals })
    return `${formatted} ${asset.symbol}`
  })
}

function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} pt`
}

function driftPointsNullable(bps: number | null): string | null {
  if (bps === null || !Number.isFinite(bps)) return null
  return driftPoints(bps)
}

function pocketOf(row: RebalancingRow): string | null {
  const at = row.strategyId.lastIndexOf(':')
  if (at < 0 || at === row.strategyId.length - 1) return null
  return row.strategyId.slice(at + 1)
}

function movementAmount(movement: Movement, vault: Vault): string {
  if (movement.assetAmountAtomic === null) return '—'
  const measured = isAvailable(vault.asset) ? vault.asset.value : null
  const decimals = measured === null ? DOCUMENTED_DECIMALS : measured.decimals
  return formatCurrency(movement.assetAmountAtomic, { fromAtomic: 10 ** decimals })
}

function clientOwnerEmptyLabel(client: Unavailable): string {
  if (client.reason === 'vault_owner_not_reported') return 'Owner not reported on vault'
  return 'Unavailable'
}

function formatExposureBps(actualBps: number | null): string {
  if (actualBps === null) return 'Unavailable'
  return formatPercent(actualBps, { fromBps: true, maximumFractionDigits: 2 })
}

function formatRebalanceAt(lastRebalanceAt: RebalancingRow['lastRebalanceAt']): string {
  if (!isAvailable(lastRebalanceAt) || lastRebalanceAt.value === '') return 'Unavailable'
  return formatDateTime(lastRebalanceAt.value)
}

function movementInvestorLabel(movement: Movement): string | null {
  if (movement.investorAddress === null) return null
  return formatAddress(movement.investorAddress) ?? movement.investorAddress
}

function movementOccurredLabel(occurredAt: string | null): string {
  if (occurredAt === null) return 'Unavailable'
  return formatRelativeTime(occurredAt)
}

function TxExplorerLink({
  txShort,
  txUrl,
}: Readonly<{ txShort: string | null; txUrl: string | null }>) {
  if (txShort === null) return 'Unavailable'
  if (txUrl === null) return txShort
  return (
    <a
      href={txUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-600 dark:text-accent-400"
    >
      {txShort}
    </a>
  )
}

function VaultClientPresence({
  client,
}: Readonly<{ client: Vault['client'] }>) {
  if (isAvailable(client)) {
    return <VaultEntityLink kind="client" id={client.value.id} label={client.value.label} />
  }
  return (
    <AdminReading value={absentReading(client)} emptyLabel={clientOwnerEmptyLabel(client)} />
  )
}

function RebalancingTableRow({ row }: Readonly<{ row: RebalancingRow }>) {
  const pocket = pocketOf(row)
  const drift = driftPointsNullable(row.varianceBps)
  return (
    <TableRow>
      <TableCell>
        <VaultEntityLink
          kind="strategy"
          id={row.strategyId}
          label={row.strategyLabel}
          sub={pocket !== null && pocket !== row.strategyLabel ? pocket : undefined}
        />
      </TableCell>
      <TableCell>
        {formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell>{formatExposureBps(row.actualBps)}</TableCell>
      <TableCell className="tabular-nums">{drift ?? 'Unavailable'}</TableCell>
      <TableCell>{formatRebalanceAt(row.lastRebalanceAt)}</TableCell>
    </TableRow>
  )
}

function VaultAllocationSection({
  scopedRebalancing,
  rebalancingList,
}: Readonly<{
  scopedRebalancing: Availability<readonly RebalancingRow[]>
  rebalancingList: readonly RebalancingRow[] | null
}>) {
  if (!isAvailable(scopedRebalancing)) {
    return (
      <>
        <ChartFrame
          question="How is exposure distributed by pocket?"
          unit="in percent — target vs exposure"
          state={{
            type: 'unavailable',
            explanation: 'Allocation read did not succeed for this vault.',
          }}
        />
        <SectionCard title="Allocation" hint="Target, exposure, and drift as reported by the service." className="mt-6">
          <Text>
            <AdminReading value={absentReading(scopedRebalancing)} />{' '}
            <Link href={entityHref('source', 'rebalancing-status')}>Data coverage</Link>
          </Text>
        </SectionCard>
      </>
    )
  }

  if (rebalancingList === null || rebalancingList.length === 0) {
    return (
      <>
        <ChartFrame
          question="How is exposure distributed by pocket?"
          unit="in percent — target vs exposure"
          state={{ type: 'empty', explanation: 'No measured pocket for this vault.' }}
        />
        <DataTableShell
          title="Allocation"
          description="Target, exposure, and drift as reported by the service."
          calme="No measured pocket for this vault."
          className="mt-6"
        />
      </>
    )
  }

  const allocationSlices = rebalancingList.map((row) => ({
    label: row.strategyLabel,
    value: row.targetBps / 100,
  }))

  return (
    <>
      <ChartFrame
        question="How is exposure distributed by pocket?"
        unit="in percent — target vs exposure"
        state={{ type: 'plotted' }}
      >
        <HearstAllocationChart
          items={rebalancingList.map<AllocationItem>((row) => ({
            label: row.strategyLabel,
            targetPct: row.targetBps / 100,
            actualPct: row.actualBps === null ? null : row.actualBps / 100,
          }))}
        />
      </ChartFrame>

      <div className="mt-6">
        <ChartFrame
          question="What is the target allocation mix?"
          unit="in percent — one color per strategy"
          state={{ type: 'plotted' }}
        >
          <HearstDonutChart slices={allocationSlices} unit="% target" />
        </ChartFrame>
      </div>

      <DataTableShell
        title="Allocation"
        description="Target, exposure, and drift as reported by the service."
        className="mt-6"
      >
        <TableHead>
          <TableRow>
            <TableHeader className={fitTableColPrimary}>Strategy</TableHeader>
            <TableHeader className={fitTableColCompact}>Target</TableHeader>
            <TableHeader className={fitTableColCompact}>Exposure</TableHeader>
            <TableHeader className={fitTableColCompact}>Drift</TableHeader>
            <TableHeader className={fitTableColCompact}>Rebalance</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rebalancingList.map((row) => <RebalancingTableRow key={row.strategyId} row={row} />)}
        </TableBody>
      </DataTableShell>
    </>
  )
}

function MovementTableRow({
  movement,
  vault,
}: Readonly<{ movement: Movement; vault: Vault }>) {
  const txShort = movement.txHash === null ? null : formatHash(movement.txHash)
  const txUrl = explorerTxUrl(movement.chainId ?? undefined, movement.txHash ?? undefined)
  const clientLabel = movementInvestorLabel(movement)
  return (
    <TableRow
      key={movement.id}
      id={`movement-${movement.id}`}
      title={clientLabel !== null ? `Client ${clientLabel}` : undefined}
    >
      <TableCell
        className="tabular-nums"
        title={movement.occurredAt === null ? undefined : formatDateTime(movement.occurredAt)}
      >
        {movementOccurredLabel(movement.occurredAt)}
      </TableCell>
      <TableCell className="truncate" title={movementSentence(movement.eventName)}>
        {movementLabel(movement.eventName)}
      </TableCell>
      <TableCell className="tabular-nums">{movementAmount(movement, vault)}</TableCell>
      <TableCell className="truncate font-mono text-sm" title={movement.txHash ?? undefined}>
        <TxExplorerLink txShort={txShort} txUrl={txUrl} />
      </TableCell>
    </TableRow>
  )
}

function VaultRecentActivitySection({
  scopedMovements,
  ledgerIsEmptyForThisVault,
  movementList,
  vault,
}: Readonly<{
  scopedMovements: Availability<readonly Movement[]>
  ledgerIsEmptyForThisVault: boolean
  movementList: readonly Movement[] | null
  vault: Vault
}>) {
  if (!isAvailable(scopedMovements)) {
    return (
      <SectionCard title="Recent activity">
        <Text>
          Recent activity could not be read.{' '}
          <Link href={entityHref('source', 'data-coverage')}>Data coverage</Link>
        </Text>
      </SectionCard>
    )
  }

  if (ledgerIsEmptyForThisVault) {
    return (
      <DataTableShell
        title="Recent activity"
        calme="The ledger responded but no movement is attributed to this vault."
      />
    )
  }

  if (movementList !== null && movementList.length > 0) {
    return (
      <DataTableShell title="Recent activity" count={`${formatNumber(movementList.length)} shown`}>
        <TableHead>
          <TableRow>
            <TableHeader className={fitTableColCompact}>Time</TableHeader>
            <TableHeader className={fitTableColPrimary}>Type</TableHeader>
            <TableHeader className={fitTableColCompact}>Amount</TableHeader>
            <TableHeader className={fitTableColPrimary}>Tx</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {movementList.map((movement) => (
            <MovementTableRow key={movement.id} movement={movement} vault={vault} />
          ))}
        </TableBody>
      </DataTableShell>
    )
  }

  return <DataTableShell title="Recent activity" calme="No indexed movement for this vault." />
}

type VaultAllocationItem = {
  readonly bucket: string
  readonly pct: string
  readonly valueUsdc: string
}

type VaultHistorySnapshot = {
  readonly id: string
  readonly takenAt: string
  readonly aumUsdc: string
  readonly btcPriceUsdc: string
  readonly currentApyLow: string
  readonly currentApyHigh: string
  readonly stressedApy: string
  readonly riskScore: number
  readonly miningMarginScore: number
  readonly mode: string
  readonly source: string
  readonly allocations?: readonly VaultAllocationItem[]
}

type BackendResolved<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
  provenance?: string | null
  freshness?: { asOf?: string | null; ageSeconds?: number | null; stale?: boolean } | null
}>

function VaultHistorySection({
  history,
  rebalancing,
}: Readonly<{
  history: Availability<readonly VaultHistorySnapshot[]>
  rebalancing: Availability<readonly RebalancingRow[]>
}>) {
  const etat: SeriesState = !isAvailable(history)
    ? {
        type: 'unavailable',
        explanation:
          history.kind === 'unavailable' && history.reason
            ? `Vault history unavailable — ${history.reason}.`
            : 'Vault history could not be read.',
      }
    : history.value.length === 0
      ? { type: 'empty', explanation: 'No historical snapshots for this vault yet.' }
      : { type: 'plotted' }

  const rebalanceDates = isAvailable(rebalancing)
    ? [...new Set(
        rebalancing.value
          .map((r) => (isAvailable(r.lastRebalanceAt) ? r.lastRebalanceAt.value.slice(0, 10) : null))
          .filter((d): d is string => d !== null),
      )]
    : []

  const combinedPoints =
    isAvailable(history) && history.value.length > 0
      ? history.value
          .map((h) => {
            const cbbtc = h.allocations?.find((a) => a.bucket.toLowerCase().includes('cbbtc'))
            const usdc = h.allocations?.find((a) => a.bucket.toLowerCase().includes('usdc'))
            return {
              label: h.takenAt.slice(0, 10),
              aum: Number(h.aumUsdc),
              cbbtcPct: cbbtc ? Number(cbbtc.pct) : 0,
              usdcPct: usdc ? Number(usdc.pct) : 0,
              detail: h.takenAt,
            }
          })
          .filter((p) => p.aum > 0)
      : []

  const btcPricePoints =
    isAvailable(history) && history.value.length > 0
      ? history.value
          .map((h) => ({
            label: h.takenAt.slice(0, 10),
            value: Number(h.btcPriceUsdc),
            detail: h.takenAt,
          }))
          .filter((p) => p.value > 0)
      : []

  const bucketSparklines = (() => {
    if (!isAvailable(history) || history.value.length === 0) return []
    const buckets = new Map<string, { bucket: string; points: Array<{ label: string; pct: number; detail: string }> }>()
    for (const snapshot of history.value) {
      const date = snapshot.takenAt.slice(0, 10)
      for (const allocation of snapshot.allocations ?? []) {
        const existing = buckets.get(allocation.bucket)
        const point = { label: date, pct: Number(allocation.pct), detail: snapshot.takenAt }
        if (existing) {
          existing.points.push(point)
        } else {
          buckets.set(allocation.bucket, { bucket: allocation.bucket, points: [point] })
        }
      }
    }
    return Array.from(buckets.values())
  })()

  return (
    <div className="space-y-6">
      <ChartFrame
        question="How has vault AUM and allocation evolved?"
        unit="AUM in USDC — cbBTC and USDC in %"
        state={etat}
      >
        {combinedPoints.length > 0 ? (
          <VaultAumCbbtcChart points={combinedPoints} rebalanceDates={rebalanceDates} />
        ) : null}
      </ChartFrame>

      {bucketSparklines.length > 0 ? (
        <ChartFrame
          question="How has each bucket drifted over time?"
          unit="in percent — rebalance dates marked"
          state={{ type: 'plotted' }}
        >
          <BucketSparklines buckets={bucketSparklines} />
        </ChartFrame>
      ) : null}

      {btcPricePoints.length > 0 ? (
        <ChartFrame
          question="What was the BTC price at each snapshot?"
          unit="in USDC — per snapshot"
          state={{ type: 'plotted' }}
        >
          <HearstLineChart points={btcPricePoints} unit="BTC price" />
        </ChartFrame>
      ) : null}
    </div>
  )
}

type RebalanceEvent = {
  readonly id: string
  readonly eventName: string
  readonly occurredAt: string | null
  readonly txHash: string | null
  readonly blockNumber: string | null
  readonly chainId: number | null
  readonly assetAmountAtomic: string | null
  readonly fromStrategy?: string | null
  readonly toStrategy?: string | null
  readonly priceUsdc?: string | null
}

function RebalancingEventsSection({
  events,
}: Readonly<{
  events: Availability<readonly RebalanceEvent[]>
}>) {
  if (!isAvailable(events)) {
    return (
      <SectionCard title="Rebalancing events">
        <Text>Rebalancing event source unavailable.</Text>
      </SectionCard>
    )
  }

  if (events.value.length === 0) {
    return (
      <DataTableShell
        title="Rebalancing events"
        calme="No rebalancing events recorded for this vault."
      />
    )
  }

  return (
    <DataTableShell
      title="Rebalancing events"
      count={`${formatNumber(events.value.length)} shown`}
    >
      <TableHead>
        <TableRow>
          <TableHeader className={fitTableColCompact}>Time</TableHeader>
          <TableHeader className={fitTableColPrimary}>Type</TableHeader>
          <TableHeader className={fitTableColPrimary}>Move</TableHeader>
          <TableHeader className={fitTableColCompact}>Amount</TableHeader>
          <TableHeader className={fitTableColCompact}>Price</TableHeader>
          <TableHeader className={fitTableColPrimary}>Tx</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.value.map((event, index) => {
          const txShort = event.txHash === null ? null : formatHash(event.txHash)
          const txUrl = explorerTxUrl(event.chainId ?? undefined, event.txHash ?? undefined)
          const move =
            event.fromStrategy && event.toStrategy
              ? `${event.fromStrategy} → ${event.toStrategy}`
              : event.fromStrategy ?? event.toStrategy ?? '—'
          return (
            <TableRow key={`${event.id ?? 'event'}-${index}`}>
              <TableCell className="tabular-nums text-xs">
                {event.occurredAt ? formatRelativeTime(event.occurredAt) : '—'}
              </TableCell>
              <TableCell className="text-sm">
                <span
                  className={clsx(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    event.eventName === 'Rebalance'
                      ? 'bg-accent-400/10 text-accent-600 dark:text-accent-400'
                      : event.eventName === 'VaultSwapped'
                        ? 'bg-warning-400/10 text-warning-600 dark:text-warning-400'
                        : 'bg-console-inset text-fg-tertiary',
                  )}
                >
                  {event.eventName}
                </span>
              </TableCell>
              <TableCell className="truncate text-xs text-fg-tertiary" title={move}>
                {move}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {event.assetAmountAtomic ? formatCurrency(event.assetAmountAtomic, { decimals: 0 }) : '—'}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {event.priceUsdc ? `$${formatNumber(Number(event.priceUsdc), { maximumFractionDigits: 0 })}` : '—'}
              </TableCell>
              <TableCell className="truncate font-mono text-xs">
                {txShort ? (
                  <a
                    href={txUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-600 dark:text-accent-400"
                  >
                    {txShort}
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </DataTableShell>
  )
}

export default async function Page({ params }: PageProps) {
  const { vaultId } = await params
  const session = await requireSession()
  const [{ registry, vault }, historyRes, rebalanceEventsRes] = await Promise.all([
    loadVault(vaultId as VaultId, session.name),
    callBackend<{
      snapshots: BackendResolved<readonly VaultHistorySnapshot[]>
    }>('vault-history', { params: { vaultId, limit: 90 } }),
    callBackend<{
      events: BackendResolved<
        readonly {
          id: string
          eventName: string
          occurredAt: string | null
          txHash: string | null
          blockNumber: string | null
          chainId: number | null
          assetAmountAtomic: string | null
          shareAmountAtomic: string | null
          investorAddress: string | null
          fromStrategy?: string | null
          toStrategy?: string | null
          priceUsdc?: string | null
        }[]
      >
    }>('events-rebalancing', { params: { vaultId, limit: 50 } }),
  ])

  const history: Availability<readonly VaultHistorySnapshot[]> = historyRes.ok
    ? historyRes.data.snapshots?.value !== null && historyRes.data.snapshots?.value !== undefined
      ? available(historyRes.data.snapshots.value, { provenance: 'unknown' })
      : unavailable({
          endpoint: '/api/v1/vault/history',
          reason: historyRes.data.snapshots?.reason ?? 'no_snapshots',
        })
    : unavailable({ endpoint: '/api/v1/vault/history', reason: 'service_did_not_respond' })

  // TODO: remove after verifying response shape
  if (rebalanceEventsRes.ok) {
    // eslint-disable-next-line no-console
    console.log('[events-rebalancing] response:', JSON.stringify(rebalanceEventsRes.data, null, 2))
  }

  const rebalanceEvents: Availability<
    readonly {
      id: string
      eventName: string
      occurredAt: string | null
      txHash: string | null
      blockNumber: string | null
      chainId: number | null
      assetAmountAtomic: string | null
      fromStrategy?: string | null
      toStrategy?: string | null
      priceUsdc?: string | null
    }[]
  > = rebalanceEventsRes.ok
    ? rebalanceEventsRes.data.events?.value !== null && rebalanceEventsRes.data.events?.value !== undefined
      ? available(rebalanceEventsRes.data.events.value, { provenance: 'unknown' })
      : unavailable({
          endpoint: '/api/v1/events/rebalancing',
          reason: rebalanceEventsRes.data.events?.reason ?? 'no_events',
        })
    : unavailable({ endpoint: '/api/v1/events/rebalancing', reason: 'service_did_not_respond' })

  if (vault === null) notFound()

  const scopedMovements = mapAvailability(registry.movements, (list) =>
    list.filter((movement) => movement.vaultId === vault.id),
  )
  const scopedRebalancing = mapAvailability(registry.rebalancing, (rows) =>
    rows.filter((row) => row.vaultId === vault.id),
  )

  const ledgerIsEmptyForThisVault =
    isAvailable(registry.movements) &&
    isAvailable(scopedMovements) &&
    registry.movements.value.length > 0 &&
    scopedMovements.value.length === 0

  const activeStatus = editorial(libelleStatutVault(vault.status))
  const aum = amountOf(vault, vault.totalAssetsAtomic)
  const deployedValue = amountOf(vault, deployedAtomic(vault))
  const availableValue = amountOf(vault, idleAtomic(vault))
  const client = vault.client

  const rebalancingList = isAvailable(scopedRebalancing) ? scopedRebalancing.value : null
  const movementList = isAvailable(scopedMovements) ? scopedMovements.value.slice(0, 12) : null

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'status', title: 'Status', value: activeStatus, icon: ShieldCheckIcon },
    { id: 'aum', title: 'AUM', value: aum, icon: BanknotesIcon },
    { id: 'deployed', title: 'Deployed', value: deployedValue, icon: ArrowTrendingUpIcon },
    { id: 'available', title: 'Available', value: availableValue, icon: ArchiveBoxIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader title={vault.label} description="Capital, allocation, and recent activity." kpis={kpis} />

      <div className="flex flex-wrap items-center gap-3">
        <VaultStatusBadge status={vault.status} />
        <VaultClientPresence client={client} />
      </div>

      <VaultAllocationSection scopedRebalancing={scopedRebalancing} rebalancingList={rebalancingList} />

      <VaultHistorySection history={history} rebalancing={scopedRebalancing} />

      <RebalancingEventsSection events={rebalanceEvents} />

      <VaultRecentActivitySection
        scopedMovements={scopedMovements}
        ledgerIsEmptyForThisVault={ledgerIsEmptyForThisVault}
        movementList={movementList}
        vault={vault}
      />

      <Text className="text-sm text-fg-tertiary dark:text-fg-secondary">
        Source health and endpoint coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
