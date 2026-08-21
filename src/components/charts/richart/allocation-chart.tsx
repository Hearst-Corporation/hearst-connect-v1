'use client'

import { chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — target vs actual allocation, paired horizontal bars.
 *
 * A pocket without an actual reading only shows the target — never a made-up 0%.
 */

export type AllocationItem = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}

const CIBLE = chartTheme.dataSeries.brandPrimary
const CONSTATE = chartTheme.dataSeries.dataReference

type Row = { label: string; targetPct: number; actualPct: number | null }

export function HearstAllocationChart({ items }: Readonly<{ items: readonly AllocationItem[] }>) {
  const { ref, width, viewportHeight } = useChartViewport({ kind: 'rows' })
  const anyActual = items.some((p) => p.actualPct !== null)
  const data: Row[] = items.map((p) => ({
    label: p.label,
    targetPct: p.targetPct,
    actualPct: p.actualPct,
  }))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <ChartAccessibilityTable
        caption="Target and actual allocation per pocket, in percent"
        columns={['Poche', 'Target', 'Actual']}
        rows={items.map((p) => ({
          key: p.label,
          label: p.label,
          cells: [formatChartPercent(p.targetPct), p.actualPct === null ? 'Not read' : formatChartPercent(p.actualPct)],
        }))}
      />

      <div
        ref={ref}
        aria-hidden="true"
        className="w-full min-w-0"
        style={{ height: viewportHeight }}
        data-chart-viewport={viewportHeight}
      >
        {width > 0 ? (
          <BarChart width={width} height={viewportHeight} data={data} layout="vertical" margin={{ ...chartTheme.margin, left: 8, right: 16 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatChartPercent(v)}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip
              content={
                <RichTooltip
                  unit="%"
                />
              }
              cursor={{ fill: chartTheme.cursor }}
            />
            {anyActual ? (
              <Legend
                wrapperStyle={{ fontSize: chartTheme.axisFontSize, color: chartTheme.tick }}
                iconType="square"
                iconSize={8}
              />
            ) : null}
            <Bar
              dataKey="targetPct"
              name="Target"
              fill={CIBLE}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
            {anyActual ? (
              <Bar
                dataKey="actualPct"
                name="Actual"
                fill={CONSTATE}
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            ) : null}
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
