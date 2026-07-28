'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Répartition horizontale — types de mouvements ou poches stratégiques.
 * Données réelles uniquement ; pas de série inventée.
 */

export type BarreRepartition = {
  readonly nom: string
  readonly valeur: number
}

const COULEURS = [
  chartTheme.series.primary,
  chartTheme.series.reference,
  chartTheme.series.success,
  chartTheme.series.warning,
  chartTheme.series.danger,
  chartTheme.series.secondary,
]

function InfoBulle({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { value?: number }[]; label?: string }>) {
  if (active !== true || !payload?.length) return null
  return (
        <div className="rounded-lg border border-brand-border bg-brand-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-brand-foreground">{label}</p>
      <p className="mt-0.5 text-brand-muted tabular-nums">{payload[0]?.value}</p>
    </div>
  )
}

export function DistributionBarChart({ barres, unit = '' }: Readonly<{ barres: readonly BarreRepartition[]; unit?: string }>) {
  if (barres.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-brand-muted">Aucune donnée à représenter.</p>
    )
  }

  const data = [...barres].sort((a, b) => b.valeur - a.valeur)

  return (
    <div className="px-2 py-4">
      <div aria-hidden="true" className="h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <XAxis type="number" tick={{ fill: chartTheme.tick, fontSize: 11 }} tickLine={false} axisLine={false} unit={unit} />
            <YAxis
              type="category"
              dataKey="nom"
              width={120}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            <Bar dataKey="valeur" radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
