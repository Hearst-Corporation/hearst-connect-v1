'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Vault Value Line Chart — AUM over time.
 *
 * A line (not bars) because totalAssets is a continuous measurement :
 * the value exists at every point, even between snapshots.
 */

export type SnapshotAum = {
  readonly takenAt: string
  readonly totalAssetsUsdc: number
}

const SERIE = chartTheme.dataSeries.brandPrimary

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: SnapshotAum }[]
}>) {
  const point = payload?.[0]?.payload
  if (active !== true || point === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{formatDate(point.takenAt)}</p>
      <p className="mt-1 text-zinc-600 tabular-nums dark:text-zinc-300">
        AUM: {formatCurrency(point.totalAssetsUsdc, { decimals: 0 })}
      </p>
    </div>
  )
}

export function VaultValueChart({
  snapshots,
}: Readonly<{ snapshots: readonly SnapshotAum[] }>) {
  if (snapshots.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">
        Aucun snapshot de valeur n'a été lu.
      </p>
    )
  }

  const sorted = [...snapshots].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
  const data = sorted.map((s) => ({
    ...s,
    label: formatDate(s.takenAt),
  }))

  const height = chartHeight('line', Math.max(data.length, 1))
  const { ref, width } = useChartWidth()

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Valeur du coffre au fil du temps</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">AUM (USDC)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.takenAt}>
                <th scope="row">{formatDate(s.takenAt)}</th>
                <td>{formatCurrency(s.totalAssetsUsdc, { decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <AreaChart
            width={width}
            height={height}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
          >
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => `$${formatNumber(v / 1_000_000, { maximumFractionDigits: 1 })}M`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartTheme.cursor }} />
            <Area
              type="monotone"
              dataKey="totalAssetsUsdc"
              name="AUM"
              stroke={SERIE}
              fill={SERIE}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIE, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {snapshots.length} snapshot{snapshots.length > 1 ? 's' : ''}. La valeur est lue depuis le point d'accès
        strategy-history et rendue telle que rapportée par le service.
      </p>
    </div>
  )
}
