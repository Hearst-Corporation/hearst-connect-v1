'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow, tooltipPoint } from '@/components/charts/richart/_shared/chart-tooltip'
import { formatNumber } from '@/lib/format'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — mini sparklines for each allocation bucket over time.
 *
 * One row per bucket. Shows allocation % trend.
 * Never `ResponsiveContainer` — explicit ResizeObserver width.
 */

export type BucketHistoryPoint = {
  readonly label: string
  readonly pct: number
  readonly detail: string
}

function BucketTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: BucketHistoryPoint }[]
}>) {
  const point = tooltipPoint(active, payload)
  if (point === null) return null
  return (
    <ChartTooltipShell compact title={point.detail}>
      <TooltipRow value={`${formatNumber(point.pct, { maximumFractionDigits: 2 })}%`} />
    </ChartTooltipShell>
  )
}

const BUCKET_COLORS = [
  chartTheme.dataSeries.brandPrimary,
  chartTheme.dataSeries.brandSecondary,
  chartTheme.dataSeries.dataReference,
  chartTheme.dataSeries.neutralSurface,
  chartTheme.dataSeries.neutralRaised,
]

function bucketColor(index: number): string {
  return BUCKET_COLORS[index % BUCKET_COLORS.length] ?? BUCKET_COLORS[0]
}

export function BucketSparklines({
  buckets,
  height = 60,
}: Readonly<{
  buckets: readonly { readonly bucket: string; readonly points: readonly BucketHistoryPoint[] }[]
  height?: number
}>) {
  const { ref, width } = useChartWidth()

  if (buckets.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary">
        No allocation data for this period.
      </p>
    )
  }

  return (
    <div className="space-y-4 px-5 pb-5">
      <ChartAccessibilityTable
        caption="Allocation per bucket over time"
        columns={['Date', ...buckets.map((b) => b.bucket)]}
        rows={(buckets[0]?.points ?? []).map((_, i) => ({
          key: String(i),
          label: buckets[0]?.points[i]?.detail ?? '',
          cells: buckets.map((b) => {
            const pct = b.points[i]?.pct
            return typeof pct === 'number' ? `${formatNumber(pct, { maximumFractionDigits: 2 })}%` : '—'
          }),
        }))}
      />

      <div ref={ref} aria-hidden="true" className="w-full min-w-0 space-y-4">
        {width > 0
          ? buckets.map((bucket, index) => {
              const data = [...bucket.points].sort((a, b) => +new Date(a.label) - +new Date(b.label))
              const color = bucketColor(index)
              return (
                <div key={bucket.bucket} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-xs font-medium text-fg-tertiary" title={bucket.bucket}>
                    {bucket.bucket}
                  </span>
                  <div className="min-w-0 flex-1">
                    <LineChart width={width - 104} height={height} data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <XAxis dataKey="label" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip content={<BucketTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="pct"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-fg">
                    {typeof data[data.length - 1]?.pct === 'number'
                      ? `${formatNumber(data[data.length - 1].pct, { maximumFractionDigits: 1 })}%`
                      : '—'}
                  </span>
                </div>
              )
            })
          : null}
      </div>
    </div>
  )
}
