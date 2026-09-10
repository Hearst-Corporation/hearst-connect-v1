'use client'

import { categoricalColor, chartTheme, type ChartViewportRole } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { ChartViewportEmpty, sortByLabelTime, useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { formatNumber } from '@/lib/format'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * richart — composition du vault dans le temps, en aires empilées.
 *
 * Le sujet est la RÉPARTITION, pas chaque poche prise isolément : empilées, les
 * aires se somment à 100 % et l'œil lit d'un coup ce qui gagne du terrain sur
 * quoi. En courbes séparées, il faudrait comparer trois hauteurs pour deviner
 * le même fait.
 *
 * Les poches viennent des DONNÉES, pas d'une liste en dur : le composant
 * précédent nommait « cbBTC » et « USDC » dans son code, deux libellés qui ne
 * correspondaient à aucune poche du produit — le graphe restait vide.
 */

export type AllocationStackPoint = {
  readonly label: string
  readonly detail: string
  readonly shares: Readonly<Record<string, number>>
}

function StackTooltip({
  active,
  payload,
  buckets,
}: Readonly<{
  active?: boolean
  payload?: readonly { payload?: Record<string, unknown> }[]
  buckets: readonly string[]
}>) {
  const row = active === true ? payload?.[0]?.payload : null
  if (row === null || row === undefined) return null

  return (
    <ChartTooltipShell title={String(row.detail ?? row.label ?? '')}>
      {buckets.map((b, i) => (
        <TooltipRow
          key={b}
          first={i === 0}
          label={b}
          value={
            typeof row[b] === 'number'
              ? `${formatNumber(row[b] as number, { maximumFractionDigits: 1 })} %`
              : '—'
          }
        />
      ))}
    </ChartTooltipShell>
  )
}

export function HearstAllocationStackChart({
  points,
  viewport,
}: Readonly<{ points: readonly AllocationStackPoint[]; viewport?: ChartViewportRole }>) {
  const { ref, width, viewportHeight } = useChartViewport({ viewport, kind: 'line' })

  if (points.length === 0) {
    return <ChartViewportEmpty viewportHeight={viewportHeight} message="No allocation history yet." />
  }

  // L'ordre des poches vient du PREMIER point : stable d'un rendu à l'autre,
  // donc les couleurs ne permutent pas quand une part change de rang.
  const buckets = Object.keys(points[0].shares)

  const sorted = sortByLabelTime(points)
  const data = sorted.map((p) => ({ label: p.label, detail: p.detail, ...p.shares }))

  return (
    <div className="flex min-w-0 flex-col" style={{ height: viewportHeight }}>
      <ChartAccessibilityTable
        caption="Vault composition over time, in percent"
        columns={['Date', ...buckets]}
        rows={sorted.map((p) => ({
          key: p.label,
          label: p.detail,
          cells: buckets.map((b) =>
            typeof p.shares[b] === 'number'
              ? `${formatNumber(p.shares[b], { maximumFractionDigits: 1 })}%`
              : 'not read',
          ),
        }))}
      />

      {/* Légende au-dessus : sans elle, trois aires de teintes proches ne se
          rattachent à aucune stratégie. */}
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-tertiary">
        {buckets.map((b, i) => (
          <li key={b} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-[3px]"
              style={{ backgroundColor: categoricalColor(i) }}
            />
            {b}
          </li>
        ))}
      </ul>

      <div ref={ref} aria-hidden="true" className="w-full min-w-0 flex-1">
        {width > 0 ? (
          <AreaChart
            width={width}
            height={Math.max(viewportHeight - 34, 80)}
            data={data}
            margin={{ ...chartTheme.margin, right: 16, left: 0 }}
          >
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={44}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={48}
              domain={[0, 100]}
              tickCount={5}
              tickFormatter={(v: number) => `${formatNumber(v, { maximumFractionDigits: 0 })}%`}
            />
            <Tooltip
              content={<StackTooltip buckets={buckets} />}
              cursor={{ stroke: chartTheme.cursor, strokeWidth: 1.5 }}
            />
            {buckets.map((b, i) => (
              <Area
                key={b}
                type="monotone"
                dataKey={b}
                stackId="allocation"
                stroke={categoricalColor(i)}
                strokeWidth={1.5}
                fill={categoricalColor(i)}
                fillOpacity={0.22}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : null}
      </div>
    </div>
  )
}
