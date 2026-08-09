import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { OperationsIndexerCard } from '@/components/admin/operations-indexer-card'
import { surfaceInset } from '@/components/admin/surface'
import { AdminToneBadge, toneForActivityStatus } from '@/components/admin/status-tone'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, DataTableShell, SectionCard, fitTableColCompact, fitTableColPrimary } from '@/components/compositions'
import {
  loadAdminOperationsSurface,
  type AdminActivityEvent,
  type AdminRebalancingSummary,
} from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import { formatHash, formatNumber, formatRelativeTime } from '@/lib/format'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import { editorial, isAvailable, type Availability } from '@/lib/vaults/model'
import { entityHref } from '@/components/vaults/vault-entity-link'
import {
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Operations' }
export const dynamic = 'force-dynamic'

/**
 * Operations — action + decision + execution history.
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

function driftPts(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

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

function RebalancingSection({
  summary,
}: Readonly<{ summary: Availability<AdminRebalancingSummary> }>) {
  if (!isAvailable(summary)) {
    return (
      <SectionCard title="Rebalancing">
        <Callout tone="warning" title="Rebalancing status unavailable">
          The rebalancing summary could not be read. Technical detail lives under{' '}
          <Link href="/admin/runtime" className="underline">
            Service
          </Link>
          .
        </Callout>
      </SectionCard>
    )
  }

  const data = summary.value
  const stable = data.strategiesOutOfTarget === 0

  return (
    <SectionCard
      title="Rebalancing"
      hint={rebalancingHint(stable, data.strategiesOutOfTarget)}
    >
      <div className="flex flex-wrap gap-3 *:flex-1 *:min-w-[10rem]">
        <div className={clsx(surfaceInset, 'p-3')}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Strategies out of target
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {formatNumber(data.strategiesOutOfTarget)}
          </p>
        </div>
        <div className={clsx(surfaceInset, 'p-3')}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Vaults out of target
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {formatNumber(data.vaultsOutOfTarget)}
          </p>
        </div>
        <div className={clsx(surfaceInset, 'p-3')}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
            Maximum drift
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {data.maxDriftBps === null ? '—' : driftPts(data.maxDriftBps)}
          </p>
        </div>
      </div>

      {data.alerts.length > 0 ? (
        <div className="mt-4">
          <DataTableShell title="Needs attention" count={`${data.alerts.length}`}>
            <TableHead>
              <TableRow>
                <TableHeader className={fitTableColPrimary}>Strategy</TableHeader>
                <TableHeader className={fitTableColCompact}>Drift</TableHeader>
                <TableHeader className={fitTableColPrimary}>Vault</TableHeader>
                <TableHeader className={`${fitTableColCompact} text-right`}>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.alerts.map((alert) => (
                <TableRow key={`${alert.vaultId}-${alert.strategyId}`}>
                  <TableCell className="font-medium">{alert.strategyLabel}</TableCell>
                  <TableCell className="tabular-nums text-warning-400">{driftPts(alert.driftBps)}</TableCell>
                  <TableCell className="font-mono text-xs text-fg-tertiary">{alert.vaultId}</TableCell>
                  <TableCell className="text-right">
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
          </DataTableShell>
        </div>
      ) : (
        <p className="mt-4 text-sm text-fg-tertiary dark:text-fg-secondary">
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

      <p className="mt-4 text-xs text-fg-tertiary dark:text-fg-secondary">
        On-chain rebalance execution is not exposed as a safe admin action. The keeper route
        requires a low-level swap payload and does not sign transactions in this service.
      </p>
    </SectionCard>
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

export default async function Page() {
  await requireSession()
  const { rebalancing, recentActivity, assetScale } = await loadAdminOperationsSurface()

  const snapshot = rebalancingSnapshotDe(rebalancing)
  const opsEvents = opsEventsDe(recentActivity)
  const kpis = kpisOperationsDe(snapshot)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Operations"
        description="Monitor portfolio drift and run supported operational actions."
        kpis={kpis}
      />

      <RebalancingSection summary={rebalancing} />

      <div className="flex flex-wrap items-start gap-4 *:flex-1 *:min-w-[14rem]">
        <OperationsIndexerCard indexerStatus={snapshot.indexerStatus} />

        <div
          className={clsx(surfaceInset, 'flex flex-col gap-1.5 p-4')}
          data-widget="operations-last-rebalance"
        >
          <p className="text-sm font-semibold text-ink dark:text-fg">Last rebalance</p>
          <p className="text-lg font-semibold text-ink dark:text-fg">
            {snapshot.lastRebalance ? formatRelativeTime(snapshot.lastRebalance) : '—'}
          </p>
          {snapshot.lastRebalanceTxHash ? (
            <p
              className="truncate font-mono text-xs text-fg-tertiary"
              title={snapshot.lastRebalanceTxHash}
            >
              {formatHash(snapshot.lastRebalanceTxHash)}
            </p>
          ) : (
            <p className="text-xs text-fg-tertiary">No transaction hash reported.</p>
          )}
        </div>
      </div>

      {opsEvents === null ? (
        <Callout tone="warning" title="Recent activity unavailable">
          Operational activity could not be read.
        </Callout>
      ) : (
        <DataTableShell
          title="Recent operations"
          description="Rebalancing, vault, and related indexed activity. Full transaction hash is on the title attribute."
          count={opsEvents.length > 0 ? `${opsEvents.length}` : undefined}
          calme={opsEvents.length === 0 ? 'No recent operational activity.' : undefined}
        >
          {opsEvents.length > 0 ? (
            <>
              <TableHead>
                <TableRow>
                  <TableHeader className={fitTableColPrimary}>Operation</TableHeader>
                  <TableHeader className={fitTableColCompact}>Status</TableHeader>
                  <TableHeader className={fitTableColCompact}>Amount</TableHeader>
                  <TableHeader className={fitTableColPrimary}>Tx</TableHeader>
                  <TableHeader className={fitTableColCompact}>When</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {opsEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="truncate font-medium" title={event.vaultId ?? undefined}>
                        {event.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AdminToneBadge tone={toneForActivityStatus(event.status)}>{event.status}</AdminToneBadge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatEventAtomic(event.amountAtomic, event.asset, assetScale)}
                    </TableCell>
                    <TableCell
                      className="truncate font-mono text-xs text-fg-tertiary"
                      title={event.txHash ?? undefined}
                    >
                      {event.txHash ? formatHash(event.txHash) : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-fg-tertiary">
                      {event.occurredAt ? formatRelativeTime(event.occurredAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : null}
        </DataTableShell>
      )}

      <Text className="text-sm text-fg-tertiary dark:text-fg-secondary">
        Technical probes and source coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service status
        </Link>
        .
      </Text>
    </div>
  )
}
