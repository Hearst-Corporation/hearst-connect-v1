'use client'

import { chartHeight, chartTheme } from '@/lib/chart-theme'
import { formatCurrency, formatPercent } from '@/lib/format'
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts'

/**
 * "How much of the deposit cap is already used?"
 *
 * A ring of two slices — what is outstanding, and what is left before the
 * cap — with the cap itself at the centre. The percentage alone would not
 * say how much room remains to raise, so both amounts are written under the
 * ring in full.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Neither slice is a verdict: a vault at 40% of its cap is not "healthy" and
 * one at 90% is not "failing", it is a business decision. So the ring stays
 * entirely on the ordinary data tokens — mint for the measured amount,
 * neutral for the room left — and spends none of the semantic palette.
 *
 * ── Size ──────────────────────────────────────────────────────────────────
 * The ring is a fixed-shape mark, not a series: its canvas comes from the
 * shared height scale at this slice count rather than from a hand-written
 * class, and the component sizes to its content instead of stretching to
 * whatever its card has left over. A ring floating in the middle of an
 * over-tall panel was one of the review's findings.
 */

/** The amount actually measured. */
const TON_ENCOURS = chartTheme.dataSeries.brandPrimary
/** The room left before the cap — a reference quantity, not a measurement. */
const TON_DISPONIBLE = chartTheme.dataSeries.neutralRaised

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
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
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
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Capacity data not available from the dashboard.
      </p>
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
    slices.push({ name: 'Outstanding', value: outstanding, fill: TON_ENCOURS })
  }
  if (available !== null && available > 0) {
    slices.push({ name: 'Available capacity', value: available, fill: TON_DISPONIBLE })
  }

  if (slices.length === 0) {
    return <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">No outstanding balance recorded.</p>
  }

  return (
    // No `h-full`: the ring plus its two lines are the whole content, and a
    // block that stretches to whatever is available is exactly how a card
    // ends up twice as tall as what it holds.
    <div className="flex flex-col">
      <div className="relative w-full" style={{ height: chartHeight('columns', slices.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* No shared cartesian margin here: `chartTheme.margin` is
              deliberately asymmetric (it reserves room for a right-hand axis
              label), and on a ring that asymmetry shifts the centre off the
              absolutely-centred cap figure sitting on top of it. */}
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
          <span className="text-[0.6875rem]/4 tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
            TVL cap
          </span>
          {utilizationLabel ? (
            <span className="mt-1 text-xs font-medium text-accent-600 dark:text-accent-400">
              {utilizationLabel} utilized
            </span>
          ) : null}
        </div>
      </div>

      {/* The amounts are written out rather than left to a hover: this list
          IS the ring's legend and its direct labelling at once, so the chart
          needs no second key. */}
      <ul className="mt-4 space-y-1.5">
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
