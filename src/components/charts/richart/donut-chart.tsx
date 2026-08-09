'use client'

import { categoricalColor } from '@/components/charts/core/chart-theme'
import { RichTooltip } from '@/components/charts/richart/tooltip'
import { formatNumber } from '@/lib/format'
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * richart — donut de répartition catégorielle (KYC, etc.).
 * Moteur Recharts derrière la frontière charts — jamais importé depuis une route.
 */

export type DonutSlice = {
  readonly label: string
  readonly value: number
}

export function HearstDonutChart({
  slices,
  unit = 'dossiers',
}: Readonly<{ slices: readonly DonutSlice[]; unit?: string }>) {
  const data = slices
    .filter((s) => s.value > 0)
    .map((s, index) => ({ ...s, fill: categoricalColor(index) }))
  const total = data.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Répartition ({unit})</caption>
          <thead>
            <tr>
              <th scope="col">Catégorie</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td>{formatNumber(s.value)}</td>
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
            <Tooltip content={<RichTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink dark:text-fg">
            {formatNumber(total)}
          </span>
          <span className="text-[11px] text-fg-tertiary">{unit}</span>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs text-console-fill dark:text-fg">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: s.fill }}
              aria-hidden="true"
            />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto tabular-nums font-medium text-ink dark:text-fg">
              {formatNumber(s.value)}
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only text-fg-tertiary">
        donut
      </span>
    </div>
  )
}
