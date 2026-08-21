import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import {
  ChartPlaceholder,
  DashCard,
  DashboardShell,
  PanelState,
  RebalancingDriftChart,
} from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { OperationsIndexerCard } from '@/components/admin/operations-indexer-card'
import { AdminToneBadge, toneForActivityStatus } from '@/components/admin/status-tone'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, tableCol, AdminTable } from '@/components/compositions'
import { HearstActivityChart, HearstDonutChart } from '@/components/charts'
import type { ActivityPoint } from '@/components/charts'
import type { AdminOperationsSurface } from '@/lib/admin-dashboard/contracts'
import {
  isAdminNotConfigured,
  loadAdminOperationsSurface,
  type AdminActivityEvent,
  type AdminRebalancingOperation,
  type AdminRebalancingSummary,
} from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import { formatDateTime, formatDriftPts, formatHash, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import { editorial, isAvailable, type Availability } from '@/lib/vaults/model'
import { entityHref } from '@/components/vaults/vault-entity-link'
import {
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: 'Operations' }
export const dynamic = 'force-dynamic'

/**
 * Operations — action + decision + execution history, shaped as a cockpit:
 * explicit Bento rows, frozen panel slots, links on the title row.
 * Technical observability lives on /admin/runtime.
 *
 * Supported write: admin indexer trigger only.
 * Low-level rebalance execute is not surfaced — swap body required and the
 * backend does not sign transactions (returns blocked / not implemented).
 */

const OPS_ACTIVITY_TYPES = new Set([
  'Rebalance',
  'VaultSwapped',
  'StrategyAdded',
  'StrategyRemoved',
  'Deposit',
  'Withdraw',
  'MiningMetricsReported',
  'deployment',
])

function attentionCount(summary: AdminRebalancingSummary): number {
  return summary.alerts.length
}

function rebalancingHint(stable: boolean, strategiesOutOfTarget: number): string {
  if (stable) {
    return 'Portfolio within target — no rebalancing action required.'
  }
  const label = strategiesOutOfTarget === 1 ? 'strategy' : 'strategies'
  return `${formatNumber(strategiesOutOfTarget)} ${label} outside target`
}

function filterOpsActivity(
  events: readonly AdminActivityEvent[],
): readonly AdminActivityEvent[] {
  return events.filter((event) => OPS_ACTIVITY_TYPES.has(event.type))
}

/**
 * Fixed panel slots (content area, px) — the box is FROZEN whether data is
 * loading, absent, or populated; taller content scrolls inside the box
 * (`scrollbar-none`). Row A is height-matched by construction:
 *   last-rebalance ≈ 126 + indexer ≈ 200 + gap 24 ≈ 350
 *     == rebalancing header 76 + slot 242 + padding 32.
 * Row B's slot is the donut block (220) — the compact charts (176) share the
 * same frozen box, so all three cards settle on the same line.
 */
const PANEL_SLOT_CLASS = {
  rebalancing: 'h-[242px] overflow-y-auto scrollbar-none',
  chart: 'h-[220px] overflow-y-auto scrollbar-none',
  table: 'h-[320px] overflow-y-auto scrollbar-none',
} as const

function RebalancingPanel({
  summary,
}: Readonly<{ summary: Availability<AdminRebalancingSummary> }>) {
  if (!isAvailable(summary)) {
    return (
      <DashCard
        title="Rebalancing"
        subtitle="Rebalancing status unavailable"
        contentClassName={PANEL_SLOT_CLASS.rebalancing}
      >
        <Callout tone="warning">
          The rebalancing summary could not be read. Technical detail lives under{' '}
          <Link href="/admin/runtime" className="underline">
            Service
          </Link>
          .
        </Callout>
      </DashCard>
    )
  }

  const data = summary.value
  const stable = data.strategiesOutOfTarget === 0

  return (
    <DashCard
      title="Rebalancing"
      subtitle={rebalancingHint(stable, data.strategiesOutOfTarget)}
      contentClassName={PANEL_SLOT_CLASS.rebalancing}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Strategies out of target
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
            {formatNumber(data.strategiesOutOfTarget)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Vaults out of target
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
            {formatNumber(data.vaultsOutOfTarget)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Maximum drift
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
            {data.maxDriftBps === null ? '—' : formatDriftPts(data.maxDriftBps)}
          </p>
        </div>
      </div>

      {data.alerts.length > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-fg">Needs attention</h4>
            <Badge color="neutral">{data.alerts.length}</Badge>
          </div>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.primary}>Strategy</TableHeader>
                <TableHeader className={tableCol.numeric}>Drift</TableHeader>
                <TableHeader className={tableCol.hash}>Vault</TableHeader>
                <TableHeader className={tableCol.action}>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.alerts.map((alert) => (
                <TableRow key={`${alert.vaultId}-${alert.strategyId}`}>
                  <TableCell className={tableCol.primary}>
                    <div className="truncate font-medium">{alert.strategyLabel}</div>
                  </TableCell>
                  <TableCell className={`${tableCol.numeric} text-warning-400`}>{formatDriftPts(alert.driftBps)}</TableCell>
                  <TableCell className={`${tableCol.hash} text-xs text-fg-tertiary`}>{alert.vaultId}</TableCell>
                  <TableCell className={tableCol.action}>
                    <Link
                      href={entityHref('vault', alert.vaultId)}
                      className="text-sm font-medium text-accent-400 underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </div>
      ) : (
        <p className="mt-4 text-sm text-fg-secondary">
          Portfolio within target. No rebalancing action required.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-tertiary">
        <span>
          Last rebalance:{' '}
          {data.lastRebalanceAt ? formatRelativeTime(data.lastRebalanceAt) : '—'}
        </span>
        {data.lastRebalanceTxHash ? (
          <span className="font-mono">{formatHash(data.lastRebalanceTxHash)}</span>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-fg-secondary">
        On-chain rebalance execution is not exposed as a safe admin action. The keeper route
        requires a low-level swap payload and does not sign transactions in this service.
      </p>
    </DashCard>
  )
}

function LastRebalanceCard({
  snapshot,
}: Readonly<{ snapshot: RebalancingSnapshot }>) {
  return (
    <div data-widget="operations-last-rebalance" className="min-w-0">
      <DashCard title="Last rebalance">
        <p className="text-lg font-semibold text-fg">
          {snapshot.lastRebalance ? formatRelativeTime(snapshot.lastRebalance) : '—'}
        </p>
        {snapshot.lastRebalance === null ? null : snapshot.lastRebalanceTxHash ? (
          <p
            className="mt-1.5 truncate font-mono text-xs text-fg-tertiary"
            title={snapshot.lastRebalanceTxHash}
          >
            {formatHash(snapshot.lastRebalanceTxHash)}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-fg-tertiary">No transaction hash reported.</p>
        )}
      </DashCard>
    </div>
  )
}

type RebalancingSnapshot = {
  readonly attention: number | null
  readonly indexerStatus: string | null
  readonly lastRebalance: string | null
  readonly lastRebalanceTxHash: string | null
  readonly strategiesOutOfTarget: number | null
}

function rebalancingSnapshotDe(
  rebalancing: Availability<AdminRebalancingSummary>,
): RebalancingSnapshot {
  if (!isAvailable(rebalancing)) {
    return {
      attention: null,
      indexerStatus: null,
      lastRebalance: null,
      lastRebalanceTxHash: null,
      strategiesOutOfTarget: null,
    }
  }

  const data = rebalancing.value
  return {
    attention: attentionCount(data),
    indexerStatus: data.indexerStatus,
    lastRebalance: data.lastRebalanceAt,
    lastRebalanceTxHash: data.lastRebalanceTxHash,
    strategiesOutOfTarget: data.strategiesOutOfTarget,
  }
}

function kpisOperationsDe(
  snapshot: RebalancingSnapshot,
): readonly AdminHeroKpi[] {
  const attentionValue =
    snapshot.attention === null
      ? editorial('Unavailable')
      : editorial(formatNumber(snapshot.attention))

  const outOfTargetValue =
    snapshot.strategiesOutOfTarget === null
      ? editorial('Unavailable')
      : editorial(formatNumber(snapshot.strategiesOutOfTarget))

  return [
    {
      id: 'attention',
      title: 'Needs attention',
      value: attentionValue,
      icon: ExclamationTriangleIcon,
    },
    {
      id: 'out-of-target',
      title: 'Strategies out of target',
      value: outOfTargetValue,
      icon: ArrowsRightLeftIcon,
    },
    {
      id: 'indexer',
      title: 'Indexer',
      value: editorial(snapshot.indexerStatus ?? 'Unavailable'),
      icon: SignalIcon,
    },
  ]
}

function opsEventsDe(
  recentActivity: Availability<readonly AdminActivityEvent[]>,
): readonly AdminActivityEvent[] | null {
  if (!isAvailable(recentActivity)) return null
  return filterOpsActivity(recentActivity.value)
}

function AllocationChartCard({
  exposure,
}: Readonly<{
  exposure: AdminOperationsSurface['exposure']
}>) {
  return (
    <DashCard
      title="How is capital allocated across strategies?"
      subtitle="in percent — target mix"
      contentClassName={PANEL_SLOT_CLASS.chart}
    >
      {!isAvailable(exposure) || exposure.value.length === 0 ? (
        <ChartPlaceholder title="Portfolio allocation" detail="No exposure data available." />
      ) : (
        <HearstDonutChart
          slices={exposure.value.map((row) => ({
            label: row.strategyLabel,
            value: row.targetBps / 100,
          }))}
          unit="% target"
        />
      )}
    </DashCard>
  )
}

function DriftHistoryCard({
  rebalancingHistory,
}: Readonly<{
  rebalancingHistory: AdminOperationsSurface['rebalancingHistory']
}>) {
  return (
    <DashCard
      title="How has portfolio drift evolved over time?"
      subtitle="in basis points — 90 days"
      contentClassName={PANEL_SLOT_CLASS.chart}
    >
      <RebalancingDriftChart rebalancingHistory={rebalancingHistory} />
    </DashCard>
  )
}

function bucketOperationsByDay(rows: readonly AdminRebalancingOperation[]): readonly ActivityPoint[] {
  const counts = new Map<string, number>()
  for (const op of rows) {
    const day = op.occurredAt.slice(0, 10)
    const existing = counts.get(day)
    counts.set(day, existing === undefined ? 1 : existing + 1)
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({
      label: day,
      value: count,
      detail: day,
    }))
}

function RebalanceCadenceCard({
  operations,
}: Readonly<{
  operations: AdminOperationsSurface['rebalancingOperations']
}>) {
  let body: ReactNode
  if (isAdminNotConfigured(operations)) {
    body = <ChartPlaceholder title="Rebalance operations" detail="No rebalance operations indexed yet." />
  } else if (!isAvailable(operations)) {
    body = (
      <ChartPlaceholder
        title="Rebalance operations could not be read."
        detail={operations.kind === 'unavailable' ? operations.reason ?? 'Source unavailable' : 'Source unavailable'}
      />
    )
  } else if (operations.value.length === 0) {
    body = <ChartPlaceholder title="Rebalance operations" detail="No rebalance operations indexed yet." />
  } else {
    body = (
      <HearstActivityChart
        points={bucketOperationsByDay(operations.value)}
        unit="ops"
        viewport="compact"
      />
    )
  }

  return (
    <DashCard
      title="When did rebalances occur?"
      subtitle="operations per day"
      contentClassName={PANEL_SLOT_CLASS.chart}
    >
      {body}
    </DashCard>
  )
}

function RebalanceOperationsCard({
  operations,
}: Readonly<{
  operations: AdminOperationsSurface['rebalancingOperations']
}>) {
  if (!isAvailable(operations) || operations.value.length === 0) {
    return (
      <DashCard
        title="Rebalance operations"
        subtitle="On-chain rebalancing events"
        contentClassName={PANEL_SLOT_CLASS.table}
      >
        {isAdminNotConfigured(operations) || isAvailable(operations) ? (
          <PanelState title="No rebalance operations indexed yet." />
        ) : (
          <PanelState
            title="Rebalance operations could not be read."
            detail={operations.kind === 'unavailable' ? operations.reason ?? 'Source unavailable' : 'Source unavailable'}
          />
        )}
      </DashCard>
    )
  }

  const rows = operations.value

  return (
    <DashCard
      title="Rebalance operations"
      subtitle="On-chain rebalance events with allocation changes and swap details."
      action={<Badge color="neutral">{`${rows.length}`}</Badge>}
      contentClassName={PANEL_SLOT_CLASS.table}
    >
      <AdminTable>
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.date}>Occurred</TableHeader>
            <TableHeader className={tableCol.hash}>Tx</TableHeader>
            <TableHeader className={tableCol.numeric}>Block</TableHeader>
            <TableHeader className={tableCol.primary}>Allocations</TableHeader>
            <TableHeader className={tableCol.primary}>Swaps</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((op: AdminRebalancingOperation) => (
            <TableRow key={op.id}>
              <TableCell className={`${tableCol.date} text-fg-tertiary`}>
                {formatDateTime(op.occurredAt)}
              </TableCell>
              <TableCell className={`${tableCol.hash} text-xs`} title={op.txHash}>
                {formatHash(op.txHash)}
              </TableCell>
              <TableCell className={tableCol.numeric}>{formatNumber(Number(op.blockNumber))}</TableCell>
              <TableCell className={tableCol.primary}>
                <div className="flex flex-wrap gap-1">
                  {op.allocations.map((a, i) => (
                    <Badge key={i} className="text-xs">
                      {formatPercent(Number(a), { fromBps: true })}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className={tableCol.primary}>
                {op.swaps.length === 0 ? (
                  <Text className="text-xs text-fg-tertiary">No swaps</Text>
                ) : (
                  <ul className="space-y-1">
                    {op.swaps.map((swap, i) => (
                      // Swap amounts are atomics of two different tokens whose
                      // decimals this surface cannot know — the raw values live
                      // on the title, never rendered as a formatted measure.
                      <li key={i} className="text-xs text-fg-tertiary" title={`${swap.tokenIn} → ${swap.tokenOut} · in ${swap.amountIn} / out ${swap.amountOut} (raw atomics)`}>
                        {formatHash(swap.tokenIn)} → {formatHash(swap.tokenOut)}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>
    </DashCard>
  )
}

const RECENT_OPERATIONS_SUBTITLE =
  'Rebalancing, vault, and related indexed activity. Full transaction hash is on the title attribute.'

function RecentOperationsCard({
  opsEvents,
  assetScale,
}: Readonly<{
  opsEvents: readonly AdminActivityEvent[] | null
  assetScale: AdminOperationsSurface['assetScale']
}>) {
  if (opsEvents === null) {
    return (
      <DashCard
        title="Recent operations"
        subtitle={RECENT_OPERATIONS_SUBTITLE}
        contentClassName={PANEL_SLOT_CLASS.table}
      >
        <PanelState title="Recent activity unavailable" detail="Operational activity could not be read." />
      </DashCard>
    )
  }

  if (opsEvents.length === 0) {
    return (
      <DashCard
        title="Recent operations"
        subtitle={RECENT_OPERATIONS_SUBTITLE}
        contentClassName={PANEL_SLOT_CLASS.table}
      >
        <PanelState title="No recent operational activity." />
      </DashCard>
    )
  }

  return (
    <DashCard
      title="Recent operations"
      subtitle={RECENT_OPERATIONS_SUBTITLE}
      action={<Badge color="neutral">{`${opsEvents.length}`}</Badge>}
      contentClassName={PANEL_SLOT_CLASS.table}
    >
      <AdminTable>
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Operation</TableHeader>
            <TableHeader className={tableCol.status}>Status</TableHeader>
            <TableHeader className={tableCol.numeric}>Amount</TableHeader>
            <TableHeader className={tableCol.hash}>Tx</TableHeader>
            <TableHeader className={tableCol.date}>When</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {opsEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell className={tableCol.primary}>
                <div className="truncate font-medium" title={event.vaultId ?? undefined}>
                  {event.title}
                </div>
              </TableCell>
              <TableCell className={tableCol.status}>
                <AdminToneBadge tone={toneForActivityStatus(event.status)}>{event.status}</AdminToneBadge>
              </TableCell>
              <TableCell className={tableCol.numeric}>
                {formatEventAtomic(event.amountAtomic, event.asset, assetScale)}
              </TableCell>
              <TableCell
                className={`${tableCol.hash} text-xs text-fg-tertiary`}
                title={event.txHash ?? undefined}
              >
                {event.txHash ? formatHash(event.txHash) : '—'}
              </TableCell>
              <TableCell className={`${tableCol.date} text-fg-tertiary`}>
                {event.occurredAt ? formatRelativeTime(event.occurredAt) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>
    </DashCard>
  )
}

export default async function Page() {
  await requireSession()
  const { rebalancing, recentActivity, assetScale, exposure, rebalancingHistory, rebalancingOperations } =
    await loadAdminOperationsSurface()

  const snapshot = rebalancingSnapshotDe(rebalancing)
  const opsEvents = opsEventsDe(recentActivity)
  const kpis = kpisOperationsDe(snapshot)

  return (
    <DashboardShell>
      <DashboardHeader
        title="Operations"
        description="Monitor portfolio drift and run supported operational actions."
        kpis={kpis}
      />

      {/* Row A — rebalancing pilotage + action rail (last rebalance, indexer). */}
      <BentoGrid>
        <BentoCard span={8}>
          <RebalancingPanel summary={rebalancing} />
        </BentoCard>
        <BentoCard span={4}>
          <div className="flex min-w-0 flex-col gap-6">
            <LastRebalanceCard snapshot={snapshot} />
            <OperationsIndexerCard indexerStatus={snapshot.indexerStatus} />
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Row B — chart trio: one frozen slot height for all three cards. */}
      <BentoGrid>
        <BentoCard span={4}>
          <AllocationChartCard exposure={exposure} />
        </BentoCard>
        <BentoCard span={4}>
          <DriftHistoryCard rebalancingHistory={rebalancingHistory} />
        </BentoCard>
        <BentoCard span={4}>
          <RebalanceCadenceCard operations={rebalancingOperations} />
        </BentoCard>
      </BentoGrid>

      {/* Row C — execution history band. */}
      <BentoGrid>
        <BentoCard span={12}>
          <RebalanceOperationsCard operations={rebalancingOperations} />
        </BentoCard>
      </BentoGrid>

      {/* Row D — operational activity band. */}
      <BentoGrid>
        <BentoCard span={12}>
          <RecentOperationsCard opsEvents={opsEvents} assetScale={assetScale} />
        </BentoCard>
      </BentoGrid>

      <Text className="text-sm text-fg-secondary">
        Technical probes and source coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service status
        </Link>
        .
      </Text>
    </DashboardShell>
  )
}
