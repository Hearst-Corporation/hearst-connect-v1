'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import { formatRelativeTime } from '@/lib/format'
import type { AdminRebalancingSummary } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

const MAX_VISIBLE_ALERTS = 4
const ALERTS_SLOT_CLASS = 'min-h-[var(--dashboard-list-slot-block-size)]'

function driftPts(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

export function RebalancingAlertsPanel({
  summary,
}: Readonly<{ summary: Availability<AdminRebalancingSummary> }>) {
  if (!isAvailable(summary)) {
    return (
      <div className="grid min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
        <div className={clsx(ALERTS_SLOT_CLASS, surfaceInset, 'flex flex-col items-center justify-center px-4 py-8 text-center')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
          <p className="mt-0.5 text-xs text-fg-tertiary">Source unavailable</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/operations">Open operations</HearstSecondaryAction>
        </div>
      </div>
    )
  }

  const data = summary.value
  const stable = data.strategiesOutOfTarget === 0
  const visibleAlerts = data.alerts.slice(0, MAX_VISIBLE_ALERTS)
  const hiddenAlerts = Math.max(data.alerts.length - visibleAlerts.length, 0)

  return (
    <div
      className="grid min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4"
      data-widget="rebalancing-alerts"
    >
      <div className={clsx(ALERTS_SLOT_CLASS, 'flex min-h-0 flex-col gap-3')}>
        <div className={clsx(surfaceInset, 'flex items-start gap-3 p-4')}>
          {stable ? (
            <CheckCircleIcon className="size-6 shrink-0 text-accent-500" aria-hidden="true" />
          ) : (
            <ExclamationTriangleIcon className="size-6 shrink-0 text-warning-500" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink dark:text-fg">
              {stable
                ? '✓ Portfolio stable'
                : `⚠ ${data.strategiesOutOfTarget} drift${data.strategiesOutOfTarget > 1 ? 's' : ''} detected`}
            </p>
            <p className="mt-1 text-xs text-fg-tertiary">
              {data.activeVaults} active vault{data.activeVaults > 1 ? 's' : ''} · {data.measuredStrategies} strateg
              {data.measuredStrategies > 1 ? 'ies' : 'y'} measured · Indexer {data.indexerStatus.toLowerCase()}
            </p>
          </div>
        </div>

        {!stable ? (
          <ul className="space-y-2">
            {visibleAlerts.map((alert) => (
              <li
                key={alert.strategyId}
                className={clsx(surfaceInset, 'flex min-w-0 items-center justify-between gap-2 px-3 py-2 text-sm')}
              >
                <span className="min-w-0 truncate font-medium text-ink dark:text-fg">{alert.strategyLabel}</span>
                <span className="shrink-0 tabular-nums text-warning-700 dark:text-warning-400">
                  {driftPts(alert.driftBps)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-console-line-soft pt-3">
        <p className="text-xs text-fg-tertiary">
          {data.lastRebalanceAt !== null
            ? `Last activity · ${formatRelativeTime(data.lastRebalanceAt)}`
            : stable
              ? 'Monitoring all measured strategies.'
              : hiddenAlerts > 0
                ? `${hiddenAlerts} more alert${hiddenAlerts > 1 ? 's' : ''} in Operations.`
                : 'Latest alert snapshot.'}
        </p>
        <HearstSecondaryAction href="/admin/operations">Open operations</HearstSecondaryAction>
      </div>
    </div>
  )
}
