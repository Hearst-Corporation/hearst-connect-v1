'use client'

import { chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — barres EMPILÉES, une par période.
 *
 * Pour un total qui se décompose : la réserve (dépôts convertis + accumulé),
 * ou ce qui s'y ajoute chaque mois (Mining · Lending · USDC). La hauteur de la
 * barre est le total ; ses tranches disent d'où il vient. Une barre par
 * période, sans lissage : chaque mois est un montant clos.
 */

export type StackSeries = Readonly<{ key: string; label: string; color: string }>
export type StackPoint = Readonly<{
  label: string
  detail: string
  values: Readonly<Record<string, number>>
  /** Le détail montré au survol sous le total — ex. la part de chaque client. */
  breakdown?: readonly Readonly<{ label: string; value: number }>[]
  breakdownTitle?: string
}>

function StackTooltip({
  active,
  payload,
  series,
  format,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: Record<string, unknown> }[]
  series: readonly StackSeries[]
  format: (v: number) => string
}>) {
  const row = active === true ? payload?.[0]?.payload : null
  if (row === null || row === undefined) return null
  const total = series.reduce((t, s) => t + (typeof row[s.key] === 'number' ? (row[s.key] as number) : 0), 0)
  return (
    <ChartTooltipShell title={String(row.detail ?? row.label ?? '')}>
      {[...series].reverse().map((s, i) => (
        <TooltipRow
          key={s.key}
          first={i === 0}
          color={s.color}
          label={s.label}
          value={typeof row[s.key] === 'number' ? format(row[s.key] as number) : '—'}
        />
      ))}
      <TooltipRow label="Total" value={format(total)} />
      {Array.isArray(row.breakdown) && row.breakdown.length > 0 ? (
        <>
          <p className="mt-2 border-t border-white/10 pt-2 text-[10px] tracking-[0.12em] text-fg-tertiary uppercase">
            {String(row.breakdownTitle ?? 'By client')}
          </p>
          {(row.breakdown as { label: string; value: number }[]).map((b) => (
            <TooltipRow key={b.label} label={b.label} value={format(b.value)} />
          ))}
        </>
      ) : null}
    </ChartTooltipShell>
  )
}

export function HearstStackedBarChart({
  points,
  series,
  unit,
  height,
  format = (v) => formatNumber(v, { maximumFractionDigits: 2 }),
  yTickFormatter = (v) => formatNumber(v, { maximumFractionDigits: 1 }),
  wide = false,
}: Readonly<{
  points: readonly StackPoint[]
  series: readonly StackSeries[]
  unit: string
  height?: number
  format?: (v: number) => string
  yTickFormatter?: (v: number) => string
  /** Colonnes épaisses, presque jointives — pour un graphique seul dans un grand panneau. */
  wide?: boolean
}>) {
  const { ref, width, viewportHeight } = useChartViewport({ height, kind: 'columns' })
  const data = points.map((p) => ({
    label: p.label,
    detail: p.detail,
    breakdown: p.breakdown,
    breakdownTitle: p.breakdownTitle,
    ...p.values,
  }))
  const legendH = 26
  const n = points.length
  const maxBarSize = wide ? 64 : n <= 6 ? 44 : n <= 12 ? 32 : 22

  return (
    <div className="min-w-0">
      <ChartAccessibilityTable
        caption={`By period, in ${unit}`}
        columns={['Period', ...series.map((s) => s.label)]}
        rows={points.map((p) => ({
          key: p.detail,
          label: p.detail,
          cells: series.map((s) => format(p.values[s.key] ?? 0)),
        }))}
      />
      {/* La légende au-dessus : sans elle, les tranches ne se rattachent à rien. */}
      <ul className="mb-2 flex h-[18px] flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-tertiary" aria-hidden="true">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-[3px]" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div ref={ref} aria-hidden="true" className="w-full min-w-0" style={{ height: Math.max(viewportHeight - legendH, 120) }}>
        {width > 0 ? (
          <BarChart
            width={width}
            height={Math.max(viewportHeight - legendH, 120)}
            data={data}
            margin={{ ...chartTheme.margin, right: 12, left: 0 }}
            barCategoryGap={wide ? '8%' : n <= 6 ? '28%' : '18%'}
          >
            <CartesianGrid stroke={chartTheme.grid} strokeOpacity={chartTheme.gridOpacity} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals
              tickFormatter={yTickFormatter}
            />
            <Tooltip content={<StackTooltip series={series} format={format} />} cursor={{ fill: chartTheme.cursor }} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="stack"
                fill={s.color}
                maxBarSize={maxBarSize}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
