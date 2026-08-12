'use client'

import type { ComponentType, SVGProps } from 'react'
import { BoltIcon, CpuChipIcon, CircleStackIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { RichSparkline } from '@/components/charts'
import { formatNumber } from '@/lib/format'
import { signalOf, valueOf, type Availability, type Signal } from '@/lib/vaults/model'
import type { MarketSnapshot } from './load'

/**
 * BtcContextFlank — the analysis band's right flank: real-time BTC/network
 * context, clearly scoped as GLOBAL market data (not vault-specific, not the
 * investor's own position — see the P0 tenant-truth doctrine already applied
 * to the rest of this page).
 *
 * `difficulty` and `hashprice` are a SNAPSHOT — the backend exposes no
 * history for either field — so this flank never draws a sparkline for them.
 * Only `btcPoints` (the vault's own BTC-at-snapshot series, already fetched
 * for the central chart) has real history, and only that one gets a trend
 * line. Every other absence stays a named "—", never a fabricated value.
 */

function freshnessLabel(signal: Signal): string | null {
  if (signal === 'live') return 'Live'
  if (signal === 'stale') return 'Stale'
  return null
}

/** BTC network difficulty is conventionally read in trillions (T). */
function difficultyLabel(raw: number | null): string {
  if (raw === null) return '—'
  return `${formatNumber(raw / 1_000_000_000_000, { maximumFractionDigits: 2 })} T`
}

function hashpriceLabel(raw: number | null): string {
  return raw !== null ? `$${formatNumber(raw, { maximumFractionDigits: 3 })}` : '—'
}

function producedLabel(raw: number | null): string {
  return raw !== null ? `${formatNumber(raw, { maximumFractionDigits: 4 })} BTC` : '—'
}

function MetricRow({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string }>) {
  return (
    <div className="term-row">
      <span className="term-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="term-label">{label}</span>
      <span className="term-value mono">{value}</span>
    </div>
  )
}

export function BtcContextFlank({
  marketSnapshot,
  btcPoints,
  btcProducedTotal,
  onViewBtc,
}: Readonly<{
  marketSnapshot: Availability<MarketSnapshot>
  btcPoints: readonly { readonly value: number }[] | null
  btcProducedTotal: Availability<number>
  onViewBtc: () => void
}>) {
  const snapshot = valueOf(marketSnapshot)
  const fresh = freshnessLabel(signalOf(marketSnapshot))
  const trend = btcPoints !== null && btcPoints.length >= 2 ? btcPoints.map((p) => p.value) : undefined
  const latestBtc = btcPoints !== null && btcPoints.length > 0 ? btcPoints[btcPoints.length - 1].value : null
  const produced = valueOf(btcProducedTotal)

  return (
    <section className="flank-panel btc-flank" aria-label="BTC network context">
      <div className="flank-heading">
        <h2>
          <CurrencyDollarIcon className="size-4" aria-hidden="true" />
          BTC context
        </h2>
        <span>Network market snapshot — not vault-specific</span>
      </div>

      <div className="btc-flank-price">
        <div className="btc-flank-price-head">
          <span>BTC price</span>
          {fresh !== null ? (
            <span className="fresh-badge" data-signal={signalOf(marketSnapshot)}>
              {fresh}
            </span>
          ) : null}
        </div>
        <strong className="btc-flank-price-value mono">
          {latestBtc !== null ? `$${formatNumber(latestBtc, { maximumFractionDigits: 0 })}` : '—'}
        </strong>
        {trend !== undefined ? (
          // Ordinary data series — mint, like every other trend line on this
          // page (chart-theme doctrine: hue is spent on MEANING, not on
          // labeling "this one is about Bitcoin").
          <div className="btc-flank-spark">
            <RichSparkline data={[...trend]} />
          </div>
        ) : null}
      </div>

      <div className="btc-flank-rows">
        <MetricRow icon={CpuChipIcon} label="Network difficulty" value={difficultyLabel(snapshot?.difficulty ?? null)} />
        <MetricRow icon={BoltIcon} label="Hashprice" value={hashpriceLabel(snapshot?.hashprice ?? null)} />
        <MetricRow icon={CircleStackIcon} label="BTC produced" value={producedLabel(produced)} />
      </div>

      <button type="button" className="btc-flank-cta" onClick={onViewBtc}>
        View BTC chart
      </button>
    </section>
  )
}
