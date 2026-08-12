'use client'

import { categoricalColor } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * richart — categorical breakdown donut (part-to-whole).
 *
 * Recharts engine behind the charts boundary — never imported from a route.
 *
 * ── Presentation options (all default to the admin call sites' behavior) ──────
 * - `format`   : 'count' (default) renders raw values; 'percent' renders `value%`
 *                and a `total%` center — for a breakdown whose values are already
 *                percentages. It never fabricates 100%: the center is the REAL sum.
 * - `showShare`: adds a `share%` column (value / total) — used when count AND
 *                share are both meaningful (activity mix), never as a duplicate of
 *                an already-percentage value (that was the old ledger's `37.6 / 37.6`).
 * - `bare`     : drops the primitive's own page padding and switches the legend to a
 *                single roomy column — for a side flank whose surface already owns
 *                its spacing (§ padding ownership). Admin keeps the padded 2-col grid.
 */

export type DonutSlice = {
  readonly label: string
  readonly value: number
}

export function HearstDonutChart({
  slices,
  unit = 'items',
  format = 'count',
  showShare = false,
  bare = false,
}: Readonly<{
  slices: readonly DonutSlice[]
  unit?: string
  format?: 'count' | 'percent'
  showShare?: boolean
  bare?: boolean
}>) {
  const data = slices
    .filter((s) => s.value > 0)
    .map((s, index) => ({ ...s, fill: categoricalColor(index) }))
  const total = data.reduce((sum, s) => sum + s.value, 0)

  const valueText = (v: number) =>
    format === 'percent' ? `${formatNumber(v, { maximumFractionDigits: 1 })}%` : formatNumber(v)
  // Center = the REAL total. For a percentage breakdown we show the measured sum
  // (≈100 when the buckets are a full split) — never a hardcoded 100%.
  const centerValue =
    format === 'percent' ? `${formatNumber(total, { maximumFractionDigits: 0 })}%` : formatNumber(total)

  // All-zero breakdown: a named absence, never a fabricated "0" over an empty ring.
  if (data.length === 0) {
    return (
      <p className={bare ? 'text-sm text-fg-tertiary dark:text-fg-secondary' : 'px-5 pb-5 text-sm text-fg-tertiary dark:text-fg-secondary'}>
        Nothing to break down yet.
      </p>
    )
  }

  return (
    <div className={bare ? '' : 'px-5 pb-5 sm:px-6'}>
      <div className="sr-only">
        <table>
          <caption>Breakdown ({unit})</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
              {showShare ? <th scope="col">Share</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td>{valueText(s.value)}</td>
                {showShare ? <td>{formatNumber((s.value / total) * 100, { maximumFractionDigits: 0 })}%</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        aria-hidden="true"
        className="relative mx-auto w-full max-w-[var(--chart-donut-viewport-max-inline-size)] h-[var(--chart-donut-viewport-block-size)]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            />
            <Tooltip content={<RichTooltip unit={format === 'percent' ? '%' : unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink dark:text-fg">{centerValue}</span>
          <span className="text-[11px] text-fg-tertiary">{unit}</span>
        </div>
      </div>

      <ul
        className={
          bare
            ? 'mt-3 flex flex-col gap-1.5'
            : 'mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5'
        }
      >
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs text-console-fill dark:text-fg">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.fill }} aria-hidden="true" />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto tabular-nums font-medium text-ink dark:text-fg">{valueText(s.value)}</span>
            {showShare ? (
              <span className="w-10 shrink-0 text-right tabular-nums text-fg-tertiary">
                {formatNumber((s.value / total) * 100, { maximumFractionDigits: 0 })}%
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
