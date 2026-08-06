'use client'

import { formatNumber } from '@/lib/format'

/**
 * Tooltip partagé richart — même surface que les charts cartésiens existants.
 * Aucune valeur inventée : affiche uniquement ce que Recharts a dans le payload.
 */

export function RichTooltip({
  active,
  payload,
  label,
  unit,
}: Readonly<{
  active?: boolean
  payload?: readonly { name?: string; value?: number | null }[]
  label?: string | number
  unit?: string
}>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const suffix = unit === undefined || unit === '' ? '' : ` ${unit}`
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      {label !== undefined && label !== '' ? (
        <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      ) : null}
      {payload.map((row) => (
        <p key={row.name ?? 'v'} className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
          {row.name === undefined || row.name === '' ? '' : `${row.name}: `}
          {typeof row.value === 'number' ? `${formatNumber(row.value)}${suffix}` : '—'}
        </p>
      ))}
    </div>
  )
}
