'use client'

import { surfaceBox } from '@/components/admin/surface'
import { formatNumber } from '@/lib/format'
import clsx from 'clsx'

/**
 * Tooltip partagé richart — même surface box que le dashboard.
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
    <div className={clsx(surfaceBox, 'px-3 py-2 text-xs shadow-lg')}>
      {label !== undefined && label !== '' ? (
        <p className="font-medium text-white">{label}</p>
      ) : null}
      {payload.map((row) => (
        <p key={row.name ?? 'v'} className="mt-0.5 text-zinc-300 tabular-nums">
          {row.name === undefined || row.name === '' ? '' : `${row.name}: `}
          {typeof row.value === 'number' ? `${formatNumber(row.value)}${suffix}` : '—'}
        </p>
      ))}
    </div>
  )
}
