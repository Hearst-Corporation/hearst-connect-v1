'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts'

/**
 * Mix capacité — donut (forme Qatar « Capacity mix »).
 * Données dashboard : encours, capacité disponible, plafond TVL.
 */

function parseUsdc(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return n / 1_000_000
}

function InfoBulle({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { name?: string; value?: number }[] }>) {
  if (active !== true || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{p?.name}</p>
      <p className="mt-0.5 tabular-nums text-zinc-500 dark:text-zinc-400">
        {typeof p?.value === 'number' ? `${p.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $` : '—'}
      </p>
    </div>
  )
}

function Tranche(props: PieSectorShapeProps) {
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
  const encours = parseUsdc(totalAssets)
  const dispo = parseUsdc(availableCapacity)

  if (encours === null && dispo === null && cap === null) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Capacité non lisible dans le dashboard.
      </p>
    )
  }

  const utilise = encours ?? null
  const disponible = dispo ?? null
  const centre = cap !== null ? `${cap.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $` : '—'
  const pct =
    utilizationBps !== null && utilizationBps !== undefined && Number.isFinite(utilizationBps)
      ? `${(utilizationBps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
      : null

  type Slice = { name: string; value: number; fill: string }

  const slices: Slice[] = []
  if (utilise !== null && utilise > 0) {
    slices.push({ name: 'Encours', value: utilise, fill: chartTheme.series.primary })
  }
  if (disponible !== null && disponible > 0) {
    slices.push({ name: 'Capacité disponible', value: disponible, fill: chartTheme.series.ghost })
  }

  if (slices.length === 0) {
    return <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Aucun encours constaté.</p>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[180px] w-full">
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
              shape={Tranche}
            />
            <Tooltip content={<InfoBulle />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">{centre}</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Plafond TVL</span>
          {pct ? <span className="mt-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">{pct} utilisé</span> : null}
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
              {s.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
