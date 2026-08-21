'use client'

import { formatDriftPts, formatPercent } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminExposureStrategy } from '@/lib/admin-dashboard/contracts'
import { isAvailable } from '@/lib/vaults/model'
import type { Availability } from '@/lib/vaults/model'
import { PanelState } from '@/components/admin/dashboard/panel-state'
import { surfaceSelect } from '@/components/admin/surface'
import { HearstDonutChart } from '@/components/charts'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

function StrategyDetail({
  row,
  assetScale,
}: Readonly<{ row: AdminExposureStrategy; assetScale: AdminAssetScale }>) {
  return (
    <div className="border-t border-console-line-soft pt-4">
      <p className="truncate text-sm font-semibold text-fg">{row.strategyLabel}</p>
      <dl className="mt-3 flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-xs">
        <div>
          <dt className="text-fg-tertiary">Actual</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {formatPercent(row.actualBps, { fromBps: true })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Target</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {formatPercent(row.targetBps, { fromBps: true })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Drift</dt>
          <dd className="font-semibold tabular-nums text-warning-400">
            {formatDriftPts(row.driftBps)}
          </dd>
        </div>
        <div>
          <dt className="text-fg-tertiary">Exposure</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {formatAdminAtomic(row.exposureAtomic, assetScale)}
          </dd>
        </div>
      </dl>
    </div>
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
    return <PanelState title="Data unavailable" detail="Portfolio exposure source unavailable." />
  }
  if (strategies.value.length === 0) {
    return (
      <PanelState
        title="No strategies measured"
        detail="No indexed strategies in the portfolio read."
      />
    )
  }

  const scale = assetScale
  if (!scale) {
    return (
      <PanelState
        title="Portfolio asset scale unavailable"
        detail="Exposure amounts stay hidden until the asset scale is readable."
      />
    )
  }

  const rows = strategies.value
  const offTargetIndex = rows.findIndex((r) => r.status !== 'on_target')
  const defaultIndex = Math.max(offTargetIndex, 0)

  const allocationSlices = rows.map((row) => ({
    label: row.strategyLabel,
    value: row.targetBps / 100,
  }))

  return (
    <TabGroup
      defaultIndex={defaultIndex}
      as="div"
      className="space-y-4 @container min-w-0"
      data-widget="portfolio-exposure"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <HearstDonutChart slices={allocationSlices} unit="% target" />
        <TabList className="grid grid-cols-2 gap-2 @[28rem]:grid-cols-4">
          {rows.map((row) => (
            <Tab
              key={row.strategyId}
              className={clsx(
                'flex min-w-0 flex-col items-center rounded-lg px-2 py-3 text-center outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-accent-500',
                surfaceSelect,
              )}
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-console-inset text-accent-300 ring-1 ring-console-line-soft">
                <ChartBarSquareIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-2 w-full truncate text-xs font-semibold text-fg" title={row.strategyLabel}>
                {row.strategyLabel}
              </span>
              <span className="mt-0.5 text-lg font-semibold tabular-nums text-fg">
                {formatPercent(row.actualBps, { fromBps: true })}
              </span>
              <span className="mt-0.5 truncate text-[11px] text-fg-tertiary">
                target {formatPercent(row.targetBps, { fromBps: true })}
              </span>
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {rows.map((row) => (
            <TabPanel key={row.strategyId} className="outline-none">
              <StrategyDetail row={row} assetScale={scale} />
            </TabPanel>
          ))}
        </TabPanels>
      </div>
    </TabGroup>
  )
}
