'use client'

import { ChartFrame } from '@/components/charts/core/chart-frame'
import { HearstLineChart, type LinePoint } from '@/components/charts/richart/line-chart'
import { formatNumber } from '@/lib/format'
import { SectionCard } from '@/components/compositions'

type DistributionRecord = {
  readonly id: string
  readonly month: string
  readonly distributionDate: string
  readonly btcAmountSats: string
  readonly btcPriceUsdc: string
  readonly yieldUsdc: string
  readonly rwaStrategyId: string
  readonly status: 'pending' | 'approved' | 'distributed'
  readonly approvedAt: string | null
  readonly approvedBy: string | null
}

export function MonthlyBtcChart({
  distributions,
}: Readonly<{
  distributions: readonly DistributionRecord[]
}>) {
  const points: LinePoint[] = distributions
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((d) => ({
      label: d.month,
      value: Number(d.btcAmountSats) / 100_000_000,
      detail: d.month,
    }))

  const state =
    points.length === 0
      ? ({ type: 'empty', explanation: 'No distribution data available for this period.' } as const)
      : ({ type: 'plotted' } as const)

  return (
    <SectionCard title="Monthly BTC earned" hint="Yield produced per month">
      <ChartFrame
        question="How much BTC does the fleet produce each month?"
        unit="in BTC"
        state={state}
      >
        <HearstLineChart
          points={points}
          unit="BTC"
          yTickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 4 })}
        />
      </ChartFrame>
    </SectionCard>
  )
}
