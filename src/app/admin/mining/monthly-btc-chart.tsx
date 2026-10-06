'use client'

import { DashCard, PanelState } from '@/components/admin/dashboard'
import { HearstActivityChart } from '@/components/charts'
import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { formatNumber } from '@/lib/format'
import type { CloseMonth } from './monthly-close'

/**
 * Ce que le PARC a miné chaque mois — et la part qui en revient aux vaults
 * des clients (leur puissance allouée, électricité déduite). Lu dans la
 * clôture mensuelle : le même chiffre que le tableau « Split by client vault »
 * juste en dessous, jamais une deuxième source.
 */
export function MonthlyBtcChart({ months }: Readonly<{ months: readonly CloseMonth[] }>) {
  const ordered = [...months].sort((a, b) => a.month.localeCompare(b.month))
  const fleet = ordered.reduce((t, m) => t + m.fleetBtcSats, 0) / 1e8
  const toVaults =
    ordered.reduce(
      (t, m) =>
        t +
        m.lines.reduce(
          (s, l) => s + l.btcSats - (m.btcPriceUsd > 0 ? Math.round((l.electricityUsd / m.btcPriceUsd) * 1e8) : 0),
          0,
        ),
      0,
    ) / 1e8
  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

  return (
    <DashCard
      className="min-w-0"
      eyebrow="Production"
      title="Bitcoin mined by the fleet"
      subtitle="Each month, the whole fleet — and the net share that goes to client reserves"
    >
      {ordered.length === 0 ? (
        <PanelState title="No monthly close recorded yet." />
      ) : (
        <div className="min-w-0 pb-10">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums text-fg">
              {formatBtcValue(fleet)} BTC
            </span>
            <span className="text-xs text-fg-tertiary">
              mined over {ordered.length} months · {formatBtcValue(toVaults)} BTC net to client reserves
            </span>
          </div>
          <HearstActivityChart
            points={ordered.map((m) => ({ label: monthLabel(m.month), value: m.fleetBtcSats / 1e8, detail: m.month }))}
            unit="BTC"
            yTickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 0 })}
          />
        </div>
      )}
    </DashCard>
  )
}
