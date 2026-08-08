'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset, surfaceSelect } from '@/components/admin/surface'
import { formatPercent } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminExposureStrategy } from '@/lib/admin-dashboard/load'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'

function driftLabel(driftBps: number | null): string {
  if (driftBps === null || !Number.isFinite(driftBps)) return '—'
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

function StrategyDetail({
  row,
  assetScale,
}: Readonly<{ row: AdminExposureStrategy; assetScale: AdminAssetScale }>) {
  const reduced = useReducedMotion()
  const body = (
    <div className={clsx(surfaceInset, 'p-4')}>
      <p className="text-sm font-semibold text-ink dark:text-fg">{row.strategyLabel}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-fg-tertiary">Actual</dt>
          <dd className="font-semibold tabular-nums text-console-shell dark:text-white">
            {formatPercent(row.actualBps, { fromBps: true })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Target</dt>
          <dd className="font-semibold tabular-nums text-console-shell dark:text-white">
            {formatPercent(row.targetBps, { fromBps: true })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Drift</dt>
          <dd className="font-semibold tabular-nums text-warning-700 dark:text-warning-400">{driftLabel(row.driftBps)}</dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Exposure</dt>
          <dd className="font-semibold tabular-nums text-console-shell dark:text-white">
            {formatAdminAtomic(row.exposureAtomic, assetScale)}
          </dd>
        </div>
      </dl>
      <div className="mt-3">
        <HearstSecondaryAction href={`/admin/vaults/${encodeURIComponent(row.vaultId)}`}>
          View vault
        </HearstSecondaryAction>
      </div>
    </div>
  )
  if (reduced) return body
  return (
    <motion.div key={row.strategyId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {body}
    </motion.div>
  )
}

export function PortfolioExposurePanel({
  strategies,
  assetScale,
}: Readonly<{
  strategies: Availability<readonly AdminExposureStrategy[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(strategies)) {
    return <p className="text-sm text-fg-tertiary">Data unavailable</p>
  }
  if (strategies.value.length === 0) {
    return <p className="text-sm text-fg-tertiary">No strategies measured</p>
  }

  const scale = assetScale
  if (!scale) {
    return <p className="text-sm text-fg-tertiary">Portfolio asset scale unavailable</p>
  }

  const rows = strategies.value
  const initial = rows.findIndex((r) => r.status !== 'on_target')
  const defaultIndex = initial >= 0 ? initial : 0

  return (
    <TabGroup defaultIndex={defaultIndex} as="div" data-widget="portfolio-exposure">
      <TabList className="grid grid-cols-2 gap-2 @[28rem]:grid-cols-3 @[52rem]:grid-cols-6">
        {rows.map((row) => (
          <Tab
            key={row.strategyId}
            className={clsx(
              'flex flex-col items-center rounded-lg px-2 py-3 text-center outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-accent-500',
              surfaceSelect,
            )}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-console-inset text-accent-300 ring-1 ring-console-line-soft">
              <ChartBarSquareIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-2 text-xs font-semibold text-ink dark:text-fg">{row.strategyLabel}</span>
            <span className="mt-0.5 text-lg font-semibold tabular-nums text-ink dark:text-fg">
              {formatPercent(row.actualBps, { fromBps: true })}
            </span>
            <span className="mt-0.5 text-[11px] text-fg-tertiary">target {formatPercent(row.targetBps, { fromBps: true })}</span>
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-4">
        {rows.map((row) => (
          <TabPanel key={row.strategyId} className="outline-none">
            <StrategyDetail row={row} assetScale={scale} />
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}
