import { PanelState } from '@/components/admin/dashboard/panel-state'
import type { AdminMarketSnapshot } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export function MarketSnapshotPanel({
  snapshot,
}: Readonly<{ snapshot: Availability<AdminMarketSnapshot> }>) {
  if (isAdminNotConfigured(snapshot)) {
    return (
      <div data-widget="market-snapshot">
        <PanelState
          status="NOT_CONFIGURED"
          title="Market feed not configured"
          detail={snapshot.kind === 'unavailable' ? (snapshot.reason ?? 'No telemetry rows in the database yet.') : null}
        />
      </div>
    )
  }

  if (!isAvailable(snapshot)) {
    return (
      <div data-widget="market-snapshot">
        <PanelState title="Data unavailable" detail={snapshot.reason ?? 'Source unavailable'} />
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

  // A change field is only a real number when it parses finite. An empty string
  // must NOT become 0% (Number('') === 0) — it stays absent.
  const finiteChange = (raw: string | null): number | null => {
    if (raw === null || raw.trim() === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  const btcChange = finiteChange(m.btcChange24hPct)
  const hashpriceChange = finiteChange(m.hashpriceChangePct)

  return (
    <dl
      data-widget="market-snapshot"
      className="@container grid grid-cols-1 gap-x-6 gap-y-5 @[16rem]:grid-cols-2 @[40rem]:grid-cols-4 @[40rem]:gap-y-0"
    >
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">BTC / USD</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{btc}</dd>
        {btcChange !== null ? (
          <dd className="mt-0.5 text-xs text-fg-tertiary">
            {formatPercent(btcChange)} 24h
          </dd>
        ) : null}
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Hashprice</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{hashprice}</dd>
        {hashpriceChange !== null ? (
          <dd className="mt-0.5 text-xs text-fg-tertiary">
            {formatPercent(hashpriceChange, { signed: true })}
          </dd>
        ) : null}
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Energy</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{energy}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">Margin</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{margin}</dd>
      </div>
    </dl>
  )
}
