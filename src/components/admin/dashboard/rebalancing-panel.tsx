'use client'

import { surfaceInset } from '@/components/admin/surface'
import { formatRelativeTime } from '@/lib/format'
import type { AdminRebalancingSummary } from '@/lib/admin-dashboard/load'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'

function driftPts(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

export function RebalancingAlertsPanel({
  summary,
}: Readonly<{ summary: Availability<AdminRebalancingSummary> }>) {
  const reduced = useReducedMotion()

  if (!isAvailable(summary)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-sm font-semibold text-zinc-950 dark:text-white">Data unavailable</p>
        <p className="mt-0.5 text-xs text-zinc-500">Source unavailable</p>
      </div>
    )
  }

  const data = summary.value
  const stable = data.strategiesOutOfTarget === 0

  const body = (
    <div className="flex flex-col gap-4" data-widget="rebalancing-alerts">
      <div className={clsx(surfaceInset, 'flex items-start gap-3 p-4')}>
        {stable ? (
          <CheckCircleIcon className="size-6 shrink-0 text-accent-500" aria-hidden="true" />
        ) : (
          <ExclamationTriangleIcon className="size-6 shrink-0 text-warning-500" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">
            {stable
              ? '✓ Portfolio stable'
              : `⚠ ${data.strategiesOutOfTarget} drift${data.strategiesOutOfTarget > 1 ? 's' : ''} detected`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.activeVaults} active vault{data.activeVaults > 1 ? 's' : ''} · {data.measuredStrategies} strateg
            {data.measuredStrategies > 1 ? 'ies' : 'y'} measured · Indexer{' '}
            {data.indexerStatus.toLowerCase()}
          </p>
        </div>
      </div>

      {!stable ? (
        <ul className="space-y-2">
          {data.alerts.map((alert) => (
            <li key={alert.strategyId} className={clsx(surfaceInset, 'flex items-center justify-between gap-2 px-3 py-2 text-sm')}>
              <span className="font-medium text-zinc-950 dark:text-white">{alert.strategyLabel}</span>
              <span className="tabular-nums text-warning-700 dark:text-warning-400">{driftPts(alert.driftBps)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {data.lastRebalanceAt !== null ? (
        <p className="text-xs text-zinc-500">
          Last activity · {formatRelativeTime(data.lastRebalanceAt)}
        </p>
      ) : null}
    </div>
  )

  if (reduced) return body
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {body}
    </motion.div>
  )
}
