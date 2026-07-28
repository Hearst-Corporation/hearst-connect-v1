'use client'

import { chartTheme } from '@/lib/chart-theme'
import { formatCurrency, formatPercent } from '@/lib/format'
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts'

/**
 * Capacity mix — donut chart.
 * Dashboard data: outstanding, available capacity, TVL cap.
 */

function parseUsdc(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return n / 1_000_000
}

function TooltipContent({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { name?: string; value?: number }[] }>) {
  if (active !== true || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{p?.name}</p>
      <p className="mt-0.5 tabular-nums text-zinc-500 dark:text-zinc-400">
        {typeof p?.value === 'number' ? formatCurrency(p.value, { fromAtomic: 1, decimals: 0 }) : '—'}
      </p>
    </div>
  )
}

function PieSliceShape(props: PieSectorShapeProps) {
  return <Sector {...props} />
}

export function UtilizationChart({
  tvlCap,
  totalAssets,
  availableCapacity,
  utilizationBps,
}: Readonly<{
  tvlCap?: string
  totalAssets?: string
  availableCapacity?: string
  utilizationBps?: number | null
}>) {
  const cap = parseUsdc(tvlCap)
  const outstanding = parseUsdc(totalAssets)
  const available = parseUsdc(availableCapacity)

  if (outstanding === null && available === null && cap === null) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Capacity data not available from the dashboard.</p>
    )
  }

  const centerLabel = formatCurrency(cap, { fromAtomic: 1, decimals: 0 })
  const utilizationLabel =
    utilizationBps !== null && utilizationBps !== undefined && Number.isFinite(utilizationBps)
      ? formatPercent(utilizationBps, { fromBps: true })
      : null

  type Slice = { name: string; value: number; fill: string }

  const slices: Slice[] = []
  if (outstanding !== null && outstanding > 0) {
    slices.push({ name: 'Outstanding', value: outstanding, fill: chartTheme.series.primary })
  }
  if (available !== null && available > 0) {
    slices.push({ name: 'Available capacity', value: available, fill: chartTheme.series.ghost })
  }

  if (slices.length === 0) {
    return <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No outstanding balance recorded.</p>
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`relative ${chartTheme.height.small} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              isAnimationActive={false}
              shape={PieSliceShape}
            />
            <Tooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">{centerLabel}</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">TVL cap</span>
          {utilizationLabel ? (
            <span className="mt-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">{utilizationLabel} utilized</span>
          ) : null}
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: s.fill }} />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-zinc-950 dark:text-white">
              {formatCurrency(s.value, { fromAtomic: 1, decimals: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
