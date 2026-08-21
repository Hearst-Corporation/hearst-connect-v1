'use client'

import { ChartTooltipShell, TooltipRow } from '@/components/charts/richart/_shared/chart-tooltip'
import { formatNumber } from '@/lib/format'

/**
 * Shared richart tooltip — the canonical `_shared` shell.
 * No invented values: renders only what Recharts has in the payload.
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
    <ChartTooltipShell title={label === undefined ? undefined : String(label)}>
      {payload.map((row, i) => (
        <TooltipRow
          key={row.name ?? 'v'}
          first={i === 0}
          label={row.name === undefined || row.name === '' ? undefined : row.name}
          value={typeof row.value === 'number' ? `${formatNumber(row.value)}${suffix}` : '—'}
        />
      ))}
    </ChartTooltipShell>
  )
}
