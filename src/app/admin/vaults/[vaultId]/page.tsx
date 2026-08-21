import { DashCard, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { BucketSparklines, ChartFrame, HearstAllocationChart, HearstDonutChart, HearstLineChart, VaultAumCbbtcChart, type AllocationItem, type SeriesState } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import { endpointById } from '@/lib/backend/endpoints'
import { toBackendRole } from '@/lib/backend/auth'
import { DataTableShell, SectionCard, tableCol } from '@/components/compositions'
import { KeeperForm } from '@/app/admin/keeper/keeper-form'
import { RebalanceNowButton } from './rebalance-now-button'
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
import { roleLabel } from '@/lib/session'
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
      className="text-accent-400"
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
      <TableCell className={tableCol.primary}>
        <VaultEntityLink
          kind="strategy"
          id={row.strategyId}
          label={row.strategyLabel}
          sub={pocket !== null && pocket !== row.strategyLabel ? pocket : undefined}
        />
      </TableCell>
      <TableCell className={tableCol.numeric}>
        {formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={tableCol.numeric}>{formatExposureBps(row.actualBps)}</TableCell>
      <TableCell className={tableCol.numeric}>{drift ?? 'Unavailable'}</TableCell>
      <TableCell className={tableCol.date}>{formatRebalanceAt(row.lastRebalanceAt)}</TableCell>
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
  // ONE state feeds the whole section: both chart frames share it, so the
  // pair stays the same two boxes whether the read is plotted, empty, or
  // unavailable (ChartFrame holds the role viewport in every state).
  const allocationState: SeriesState = !isAvailable(scopedRebalancing)
    ? {
        type: 'unavailable',
        explanation: 'Allocation read did not succeed for this vault.',
      }
    : rebalancingList === null || rebalancingList.length === 0
      ? { type: 'empty', explanation: 'No measured pocket for this vault.' }
      : { type: 'plotted' }

  const plottedList =
    allocationState.type === 'plotted' && rebalancingList !== null ? rebalancingList : null

  const allocationSlices = (plottedList ?? []).map((row) => ({
    label: row.strategyLabel,
    value: row.targetBps / 100,
  }))

  return (
    <>
      {/* Row A — the chart pair: equal viewports, equal heights. */}
      <BentoGrid>
        <BentoCard span={6}>
          <ChartFrame
            question="How is exposure distributed by pocket?"
            unit="in percent — target vs exposure"
            state={allocationState}
          >
            {plottedList !== null ? (
              <HearstAllocationChart
                items={plottedList.map<AllocationItem>((row) => ({
                  label: row.strategyLabel,
                  targetPct: row.targetBps / 100,
                  actualPct: row.actualBps === null ? null : row.actualBps / 100,
                }))}
              />
            ) : null}
          </ChartFrame>
        </BentoCard>
        <BentoCard span={6}>
          <ChartFrame
            question="What is the target allocation mix?"
            unit="in percent — one color per strategy"
            state={allocationState}
          >
            {plottedList !== null ? (
              <HearstDonutChart slices={allocationSlices} unit="% target" />
            ) : null}
          </ChartFrame>
        </BentoCard>
      </BentoGrid>

      {/* Row B — the allocation table band. */}
      <BentoGrid>
        <BentoCard span={12}>
          {!isAvailable(scopedRebalancing) ? (
            <SectionCard title="Allocation" hint="Target, exposure, and drift as reported by the service.">
              <Text>
                <AdminReading value={absentReading(scopedRebalancing)} />{' '}
                <Link href={entityHref('source', 'rebalancing-status')}>Data coverage</Link>
              </Text>
            </SectionCard>
          ) : plottedList === null ? (
            <DataTableShell
              title="Allocation"
              description="Target, exposure, and drift as reported by the service."
              calme="No measured pocket for this vault."
            />
          ) : (
            <DataTableShell
              title="Allocation"
              description="Target, exposure, and drift as reported by the service."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Strategy</TableHeader>
                  <TableHeader className={tableCol.numeric}>Target</TableHeader>
                  <TableHeader className={tableCol.numeric}>Exposure</TableHeader>
                  <TableHeader className={tableCol.numeric}>Drift</TableHeader>
                  <TableHeader className={tableCol.date}>Rebalance</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {plottedList.map((row) => <RebalancingTableRow key={row.strategyId} row={row} />)}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>
      </BentoGrid>
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
        className={tableCol.date}
        title={movement.occurredAt === null ? undefined : formatDateTime(movement.occurredAt)}
      >
        {movementOccurredLabel(movement.occurredAt)}
      </TableCell>
      <TableCell className={tableCol.primary} title={movementSentence(movement.eventName)}>
        <div className="truncate">{movementLabel(movement.eventName)}</div>
      </TableCell>
      <TableCell className={tableCol.numeric}>{movementAmount(movement, vault)}</TableCell>
      <TableCell className={`${tableCol.hash} text-sm`} title={movement.txHash ?? undefined}>
        <TxExplorerLink txShort={txShort} txUrl={txUrl} />
      </TableCell>
    </TableRow>
  )
}

function VaultKeeperActionsSection({
  isAdmin,
  disabledReason,
}: Readonly<{ isAdmin: boolean; disabledReason: string | null }>) {
  const rwaEndpoint = endpointById('keeper-rwa-vault')

  return (
    <BentoGrid>
      <BentoCard span={12}>
        <DashCard
          title="Keeper actions"
          subtitle="Vault-specific operational requests — no transaction is signed."
        >
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div>
              <Text className="text-sm font-medium">Rebalance</Text>
              <Text className="text-xs text-fg-tertiary">
                Trigger an on-chain rebalance of the vault allocation.
              </Text>
              <div className="mt-3">
                <RebalanceNowButton disabled={!isAdmin} disabledReason={disabledReason} />
              </div>
            </div>
            <KeeperForm
              endpoint={rwaEndpoint}
              disabled={!isAdmin}
              disabledReason={disabledReason}
            />
          </div>
        </DashCard>
      </BentoCard>
    </BentoGrid>
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
      <BentoGrid>
        <BentoCard span={12}>
          <SectionCard title="Recent activity">
            <Text>
              Recent activity could not be read.{' '}
              <Link href={entityHref('source', 'data-coverage')}>Data coverage</Link>
            </Text>
          </SectionCard>
        </BentoCard>
      </BentoGrid>
    )
  }

  if (ledgerIsEmptyForThisVault) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <DataTableShell
            title="Recent activity"
            calme="The ledger responded but no movement is attributed to this vault."
          />
        </BentoCard>
      </BentoGrid>
    )
  }

  if (movementList !== null && movementList.length > 0) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <DataTableShell title="Recent activity" count={`${formatNumber(movementList.length)} shown`}>
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.date}>Time</TableHeader>
                <TableHeader className={tableCol.primary}>Type</TableHeader>
                <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                <TableHeader className={tableCol.hash}>Tx</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {movementList.map((movement) => (
                <MovementTableRow key={movement.id} movement={movement} vault={vault} />
              ))}
            </TableBody>
          </DataTableShell>
        </BentoCard>
      </BentoGrid>
    )
  }

  return (
    <BentoGrid>
      <BentoCard span={12}>
        <DataTableShell title="Recent activity" calme="No indexed movement for this vault." />
      </BentoCard>
    </BentoGrid>
  )
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
    <>
      {/* Row C — the dominant history band. */}
      <BentoGrid>
        <BentoCard span={12}>
          <ChartFrame
            question="How has vault AUM and allocation evolved?"
            unit="AUM in USDC — cbBTC and USDC in %"
            state={etat}
          >
            {combinedPoints.length > 0 ? (
              <VaultAumCbbtcChart points={combinedPoints} rebalanceDates={rebalanceDates} />
            ) : null}
          </ChartFrame>
        </BentoCard>
      </BentoGrid>

      {/*
        Row D — the secondary pair, rendered only when the history read
        succeeded (an unavailable read already speaks through Row C). Each
        frame keeps its box in every data state: no points → the frame's
        empty state, never a missing column.
      */}
      {isAvailable(history) ? (
        <BentoGrid>
          <BentoCard span={6}>
            <ChartFrame
              question="How has each bucket drifted over time?"
              unit="in percent — rebalance dates marked"
              state={
                bucketSparklines.length > 0
                  ? { type: 'plotted' }
                  : { type: 'empty', explanation: 'No bucket allocation in the snapshots for this vault.' }
              }
            >
              {bucketSparklines.length > 0 ? (
                <BucketSparklines buckets={bucketSparklines} />
              ) : null}
            </ChartFrame>
          </BentoCard>
          <BentoCard span={6}>
            <ChartFrame
              question="What was the BTC price at each snapshot?"
              unit="in USDC — per snapshot"
              state={
                btcPricePoints.length > 0
                  ? { type: 'plotted' }
                  : { type: 'empty', explanation: 'No BTC price in the snapshots for this vault.' }
              }
            >
              {btcPricePoints.length > 0 ? (
                <HearstLineChart points={btcPricePoints} unit="BTC price" />
              ) : null}
            </ChartFrame>
          </BentoCard>
        </BentoGrid>
      ) : null}
    </>
  )
}

type RebalanceEvent = {
  readonly name: string
  readonly category: string
  readonly severity: string
  readonly actor: string | null
  readonly amount: string | null
  readonly txHash: string | null
  readonly blockNumber: number | null
  readonly timestamp: string | null
  readonly explorerUrl: string | null
  readonly visibility: string
}

function RebalancingEventsSection({
  events,
}: Readonly<{
  events: Availability<readonly RebalanceEvent[]>
}>) {
  if (!isAvailable(events)) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <SectionCard title="Rebalancing events">
            <Text>Rebalancing event source unavailable.</Text>
          </SectionCard>
        </BentoCard>
      </BentoGrid>
    )
  }

  if (events.value.length === 0) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <DataTableShell
            title="Rebalancing events"
            calme="No rebalancing events recorded for this vault."
          />
        </BentoCard>
      </BentoGrid>
    )
  }

  return (
    <BentoGrid>
      <BentoCard span={12}>
        <DataTableShell
          title="Rebalancing events"
          count={`${formatNumber(events.value.length)} shown`}
        >
          <TableHead>
            <TableRow>
              <TableHeader className={tableCol.date}>Time</TableHeader>
              <TableHeader className={tableCol.status}>Type</TableHeader>
              <TableHeader className={tableCol.primary}>Category</TableHeader>
              <TableHeader className={tableCol.numeric}>Amount</TableHeader>
              <TableHeader className={tableCol.numeric}>Block</TableHeader>
              <TableHeader className={tableCol.hash}>Tx</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.value.map((event, index) => {
              const txShort = event.txHash === null ? null : formatHash(event.txHash)
              const txUrl = event.explorerUrl ?? undefined
              return (
                <TableRow key={`${event.txHash ?? 'event'}-${index}`}>
                  <TableCell className={`${tableCol.date} text-xs`}>
                    {event.timestamp ? formatRelativeTime(event.timestamp) : '—'}
                  </TableCell>
                  <TableCell className={`${tableCol.status} text-sm`}>
                    <span
                      className={clsx(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        event.name === 'Rebalance'
                          ? 'bg-accent-400/10 text-accent-400'
                          : event.name === 'VaultSwapped'
                            ? 'bg-warning-400/10 text-warning-400'
                            : 'bg-console-inset text-fg-tertiary',
                      )}
                    >
                      {event.name}
                    </span>
                  </TableCell>
                  <TableCell className={`${tableCol.primary} text-xs text-fg-tertiary`}>
                    <div className="truncate">{event.category}</div>
                  </TableCell>
                  <TableCell className={`${tableCol.numeric} text-xs`}>
                    {event.amount ? formatCurrency(event.amount, { decimals: 0 }) : '—'}
                  </TableCell>
                  <TableCell className={`${tableCol.numeric} text-xs`}>
                    {event.blockNumber ? formatNumber(event.blockNumber) : '—'}
                  </TableCell>
                  <TableCell className={`${tableCol.hash} text-xs`}>
                    {txShort ? (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-400"
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
      </BentoCard>
    </BentoGrid>
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
          name: string
          category: string
          severity: string
          actor: string | null
          amount: string | null
          txHash: string | null
          blockNumber: number | null
          timestamp: string | null
          explorerUrl: string | null
          visibility: string
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

  const rebalanceEvents: Availability<
    readonly {
      name: string
      category: string
      severity: string
      actor: string | null
      amount: string | null
      txHash: string | null
      blockNumber: number | null
      timestamp: string | null
      explorerUrl: string | null
      visibility: string
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

  const isAdmin = toBackendRole(session.role) === 'admin'
  const disabledReason = isAdmin
    ? null
    : `Role ${roleLabel(session.role)} does not grant access to Keeper actions.`

  return (
    <DashboardShell>
      <DashboardHeader title={vault.label} description="Capital, allocation, and recent activity." kpis={kpis} />

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

      <VaultKeeperActionsSection isAdmin={isAdmin} disabledReason={disabledReason} />

      {/* Page-level provenance note — one quiet text line, not a bordered strip. */}
      <Text className="text-sm text-fg-secondary">
        Source health and endpoint coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </DashboardShell>
  )
}
