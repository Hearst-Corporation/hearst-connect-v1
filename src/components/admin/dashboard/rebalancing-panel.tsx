'use client'

import { PanelState } from '@/components/admin/dashboard/panel-state'
import { formatDriftPts, formatRelativeTime, pluralSuffix, strategySuffix } from '@/lib/format'
import type { AdminRebalancingSummary } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

function statusHeadline(data: AdminRebalancingSummary, stable: boolean): string {
  if (stable) return '✓ Portfolio stable'
  return `⚠ ${data.strategiesOutOfTarget} drift${pluralSuffix(data.strategiesOutOfTarget)} detected`
}

function statusDetail(data: AdminRebalancingSummary): string {
  return `${data.activeVaults} active vault${pluralSuffix(data.activeVaults)} · ${data.measuredStrategies} strateg${strategySuffix(data.measuredStrategies)} measured · Indexer ${data.indexerStatus.toLowerCase()}`
}

function footerNote(data: AdminRebalancingSummary, stable: boolean): string {
  if (data.lastRebalanceAt !== null) {
    return `Last activity · ${formatRelativeTime(data.lastRebalanceAt)}`
  }
  if (stable) return 'Monitoring all measured strategies.'
  return 'Review drift alerts in Operations.'
}

export function RebalancingAlertsPanel({
  summary,
}: Readonly<{ summary: Availability<AdminRebalancingSummary> }>) {
  if (!isAvailable(summary)) {
    return <PanelState title="Data unavailable" detail="Source unavailable" />
  }

  const data = summary.value
  const stable = data.strategiesOutOfTarget === 0

  return (
    <div className="space-y-4" data-widget="rebalancing-alerts">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3">
          {stable ? (
            <CheckCircleIcon className="size-6 shrink-0 text-accent-500" aria-hidden="true" />
          ) : (
            <ExclamationTriangleIcon className="size-6 shrink-0 text-warning-500" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{statusHeadline(data, stable)}</p>
            <p className="mt-1 text-xs text-fg-tertiary">{statusDetail(data)}</p>
          </div>
        </div>

        {!stable ? (
          <ul className="space-y-2">
            {data.alerts.map((alert) => (
              <li
                key={alert.strategyId}
                className="flex min-w-0 items-center justify-between gap-2 border-t border-console-line-soft py-2 text-sm first:border-t-0"
              >
                <span className="min-w-0 truncate font-medium text-fg">{alert.strategyLabel}</span>
                <span className="shrink-0 tabular-nums text-warning-400">
                  {formatDriftPts(alert.driftBps)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-xs text-fg-tertiary">{footerNote(data, stable)}</p>
    </div>
  )
}
