'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
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
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null
  return (
    <div className="rounded-lg bg-white px-2 py-1 text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line">
      <p className="font-medium text-ink dark:text-fg">{point.detail}</p>
      <p className="tabular-nums text-fg-tertiary">{formatNumber(point.pct, { maximumFractionDigits: 2 })}%</p>
    </div>
  )
}

const BUCKET_COLORS = [
  chartTheme.dataSeries.brandPrimary,
  chartTheme.dataSeries.brandSecondary,
  chartTheme.dataSeries.dataReference,
  '#94a3b8',
  '#64748b',
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
      <div className="sr-only">
        <table>
          <caption>Allocation per bucket over time</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {buckets.map((b) => (
                <th key={b.bucket} scope="col">{b.bucket}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets[0]?.points.map((_, i) => (
              <tr key={i}>
                <th scope="row">{buckets[0].points[i]?.detail}</th>
                {buckets.map((b) => (
                  <td key={b.bucket}>{formatNumber(b.points[i]?.pct ?? 0, { maximumFractionDigits: 2 })}%</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                    {formatNumber(data[data.length - 1]?.pct ?? 0, { maximumFractionDigits: 1 })}%
                  </span>
                </div>
              )
            })
          : null}
      </div>
    </div>
  )
}
