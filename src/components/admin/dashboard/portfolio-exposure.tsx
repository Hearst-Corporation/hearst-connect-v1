'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset, surfaceSelect } from '@/components/admin/surface'
import { formatPercent } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminExposureStrategy } from '@/lib/admin-dashboard/contracts'
import { isAvailable } from '@/lib/vaults/model'
import type { Availability } from '@/lib/vaults/model'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

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
  return (
    <div className={clsx(surfaceInset, 'p-4 @container')}>
      <p className="truncate text-sm font-semibold text-ink dark:text-fg">{row.strategyLabel}</p>
      <div className="mt-3 flex flex-col gap-3 @[28rem]:flex-row @[28rem]:items-end @[28rem]:justify-between">
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 text-xs @[28rem]:grid-cols-4">
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
            <dd className="font-semibold tabular-nums text-warning-700 dark:text-warning-400">
              {driftLabel(row.driftBps)}
            </dd>
          </div>
          <div>
            <dt className="text-fg-tertiary">Exposure</dt>
            <dd className="font-semibold tabular-nums text-fg">
              {formatAdminAtomic(row.exposureAtomic, assetScale)}
            </dd>
          </div>
        </dl>
        <div className="shrink-0">
          <HearstSecondaryAction href={`/admin/vaults/${encodeURIComponent(row.vaultId)}`}>
            View vault
          </HearstSecondaryAction>
        </div>
      </div>
    </div>
  )
}

function ExposureEmptyState({
  title,
  detail,
}: Readonly<{ title: string; detail: string }>) {
  return (
    <div className="space-y-4">
      <div className={clsx(surfaceInset, 'flex flex-col justify-center gap-2 px-4 py-5')}>
        <p className="text-sm font-semibold text-ink dark:text-fg">{title}</p>
        <p className="text-xs text-fg-tertiary">{detail}</p>
      </div>
      <div className="flex justify-end border-t border-console-line-soft pt-3">
        <HearstSecondaryAction href="/admin/vaults">Open vault registry</HearstSecondaryAction>
      </div>
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
    return (
      <ExposureEmptyState title="Data unavailable" detail="Portfolio exposure source unavailable." />
    )
  }
  if (strategies.value.length === 0) {
    return (
      <ExposureEmptyState
        title="No strategies measured"
        detail="No indexed strategies in the portfolio read."
      />
    )
  }

  const scale = assetScale
  if (!scale) {
    return (
      <ExposureEmptyState
        title="Portfolio asset scale unavailable"
        detail="Exposure amounts stay hidden until the asset scale is readable."
      />
    )
  }

  const rows = strategies.value
  const offTargetIndex = rows.findIndex((r) => r.status !== 'on_target')
  const defaultIndex = Math.max(offTargetIndex, 0)

  return (
    <TabGroup
      defaultIndex={defaultIndex}
      as="div"
      className="space-y-4 @container min-w-0"
      data-widget="portfolio-exposure"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
          <TabList className="grid min-w-max grid-flow-col auto-cols-[minmax(8rem,1fr)] gap-2">
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
                <span className="mt-2 w-full truncate text-xs font-semibold text-ink dark:text-fg" title={row.strategyLabel}>
                  {row.strategyLabel}
                </span>
                <span className="mt-0.5 text-lg font-semibold tabular-nums text-ink dark:text-fg">
                  {formatPercent(row.actualBps, { fromBps: true })}
                </span>
                <span className="mt-0.5 truncate text-[11px] text-fg-tertiary">
                  target {formatPercent(row.targetBps, { fromBps: true })}
                </span>
              </Tab>
            ))}
          </TabList>
        </div>
        <TabPanels>
          {rows.map((row) => (
            <TabPanel key={row.strategyId} className="outline-none">
              <StrategyDetail row={row} assetScale={scale} />
            </TabPanel>
          ))}
        </TabPanels>
      </div>
      <div className="flex justify-end border-t border-console-line-soft pt-3">
        <HearstSecondaryAction href="/admin/vaults">Open vault registry</HearstSecondaryAction>
      </div>
    </TabGroup>
  )
}
