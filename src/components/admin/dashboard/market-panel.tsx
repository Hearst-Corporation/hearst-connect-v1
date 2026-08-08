'use client'

import { surfaceInset } from '@/components/admin/surface'
import { StatusBadge } from '@/components/admin/truthful'
import type { AdminMarketSnapshot } from '@/lib/admin-dashboard/load'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/load'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export function MarketSnapshotPanel({
  snapshot,
}: Readonly<{ snapshot: Availability<AdminMarketSnapshot> }>) {
  if (isAdminNotConfigured(snapshot)) {
    return (
      <div
        data-widget="market-snapshot"
        className={
          surfaceInset +
          ' flex min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center'
        }
      >
        <StatusBadge status="NOT_CONFIGURED" />
        <p className="text-sm font-semibold text-ink dark:text-fg">Market feed not configured</p>
        <p className="text-xs text-fg-tertiary">
          {snapshot.kind === 'unavailable' ? snapshot.reason ?? 'No telemetry rows in the database yet.' : null}
        </p>
      </div>
    )
  }

  if (!isAvailable(snapshot)) {
    return (
      <div
        data-widget="market-snapshot"
        className={
          surfaceInset +
          ' flex min-h-[260px] flex-col items-center justify-center p-6 text-center'
        }
      >
        <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
        <p className="mt-1 text-xs text-fg-tertiary">{snapshot.reason ?? 'Source unavailable'}</p>
      </div>
    )
  }

  const m = snapshot.value
  const btc =
    m.btcUsd !== null
      ? formatCurrency(m.btcUsd, { unit: '$', fromAtomic: 1, decimals: 0 })
      : '—'
  const hashprice = m.hashprice !== null ? `$${m.hashprice}` : '—'
  const energy = m.energyCostUsdKwh !== null ? `$${m.energyCostUsdKwh} / kWh` : '—'
  const margin =
    m.miningMarginScore !== null
      ? formatNumber(m.miningMarginScore, { maximumFractionDigits: 0 })
      : '—'

  return (
    <dl data-widget="market-snapshot" className="grid grid-cols-2 gap-4">
      <div className={surfaceInset + ' p-4'}>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">BTC / USD</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">{btc}</dd>
        {m.btcChange24hPct !== null ? (
          <dd className="mt-0.5 text-xs text-fg-tertiary">
            {formatPercent(Number(m.btcChange24hPct))} 24h
          </dd>
        ) : null}
      </div>
      <div className={surfaceInset + ' p-4'}>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Hashprice</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">{hashprice}</dd>
        {m.hashpriceChangePct !== null ? (
          <dd className="mt-0.5 text-xs text-fg-tertiary">
            {formatPercent(Number(m.hashpriceChangePct), { signed: true })}
          </dd>
        ) : null}
      </div>
      <div className={surfaceInset + ' p-4'}>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Energy</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums text-ink dark:text-fg">{energy}</dd>
      </div>
      <div className={surfaceInset + ' p-4'}>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Margin</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums text-ink dark:text-fg">{margin}</dd>
      </div>
    </dl>
  )
}
