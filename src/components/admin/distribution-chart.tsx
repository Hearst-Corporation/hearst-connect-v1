'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from 'recharts'

/**
 * Horizontal distribution — movement types or strategic pockets.
 * Real data only; no invented series.
 */

export type BarreRepartition = {
  readonly nom: string
  readonly valeur: number
}

const COLORS = [
  chartTheme.series.primary,
  chartTheme.series.reference,
  chartTheme.series.positive,
  chartTheme.series.warning,
  chartTheme.series.negative,
  chartTheme.series.secondary,
]

type BarWithColor = BarreRepartition & { readonly fill: string }

function ChartTooltip({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { value?: number }[]; label?: string }>) {
  if (active !== true || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">{payload[0]?.value}</p>
    </div>
  )
}

function ColoredBar(props: BarShapeProps) {
  const payload = props.payload as BarWithColor | undefined
  return <Rectangle {...props} fill={payload?.fill ?? chartTheme.series.primary} />
}

export function DistributionBarChart({ barres, unit = '' }: Readonly<{ barres: readonly BarreRepartition[]; unit?: string }>) {
  if (barres.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No data to display.</p>
  }

  const data: BarWithColor[] = [...barres]
    .sort((a, b) => b.valeur - a.valeur)
    .map((b, i) => ({ ...b, fill: COLORS[i % COLORS.length]! }))

  return (
    <div className="px-2 py-4">
      <div aria-hidden="true" className={`${chartTheme.height.medium} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={chartTheme.margin}>
            <XAxis
              type="number"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              unit={unit}
            />
            <YAxis
              type="category"
              dataKey="nom"
              width={120}
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.cursor }} />
            <Bar dataKey="valeur" shape={ColoredBar} radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
