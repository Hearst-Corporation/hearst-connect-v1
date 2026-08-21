'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts'
import { chartTheme } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { useChartViewport } from '@/components/charts/richart/_shared/viewport'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatCurrency } from '@/lib/format'

/**
 * Product-surface charts.
 *
 * Each answers ONE question, posed verbatim in its title by the calling
 * frame. None invents a data point: when the series is missing, the caller
 * renders the frame's waiting state rather than a flat curve that would read
 * as a real zero measurement.
 *
 * ── Sizing ────────────────────────────────────────────────────────────────
 * The canvas derives from a fixed role viewport (`chartViewport`, in pixels):
 * two allocation rows get a two-row canvas, not a fixed block that would leave
 * empty plot beneath the bars.
 *
 * ── Palette ───────────────────────────────────────────────────────────────
 * Reads `chartTheme.dataSeries` — mint and neutral, the ordinary-data roles.
 * Nothing here carries state, so nothing here may borrow a semantic color.
 *
 * Animations are disabled everywhere: in an operations console, motion
 * delays reading without teaching anything, and it trips up screenshots.
 */

/** The measured quantity. */
const SERIE = chartTheme.dataSeries.brandPrimary
/** What it is read against — the other half of the allocation. */
const REFERENCE = chartTheme.dataSeries.dataReference

/* ── Reserve and exposure ────────────────────────────────────────────────── */

export type BitcoinItem = { readonly item: string; readonly amount: number; readonly accent: boolean }

/**
 * `accent` selects between two ORDINARY colors — the mint that carries the
 * measurement and the neutral it is read against. It is not a state flag, and
 * it never reaches for a semantic color: an allocation split is not an alarm.
 */
function PostBar(props: BarShapeProps) {
  const payload = props.payload as BitcoinItem | undefined
  return <Rectangle {...props} fill={payload?.accent === true ? SERIE : REFERENCE} />
}

/** "How much sits in reserve, how much is deployed as exposure?" */
export function ReserveExposureChart({ items }: Readonly<{ items: readonly BitcoinItem[] }>) {
  // Hooks before the early return (rules-of-hooks).
  const { ref, width, viewportHeight } = useChartViewport({ kind: 'rows' })

  if (items.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-fg-secondary">
        No allocation readable on-chain. Nothing is plotted, rather than a split at zero.
      </p>
    )
  }

  return (
    <div className="px-3 pb-5 sm:px-4">
      <ChartAccessibilityTable
        caption="Reserve and exposure, in dollars"
        columns={['Item', 'Amount']}
        rows={items.map((p) => ({
          key: p.item,
          label: p.item,
          cells: [formatCurrency(p.amount, { fromAtomic: 1, decimals: 0 })],
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
          <BarChart width={width} height={viewportHeight} data={[...items]} layout="vertical" margin={chartTheme.margin}>
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
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="item"
              tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<RichTooltip unit="$" />} cursor={{ fill: chartTheme.cursor }} />
            <Bar
              dataKey="amount"
              name="Amount"
              shape={PostBar}
              radius={[0, 3, 3, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        ) : null}
      </div>
    </div>
  )
}
