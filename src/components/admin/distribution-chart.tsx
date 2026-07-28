'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from 'recharts'

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

type BarreAvecCouleur = BarreRepartition & { readonly fill: string }

function InfoBulle({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { value?: number }[]; label?: string }>) {
  if (active !== true || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">{payload[0]?.value}</p>
    </div>
  )
}

function BarreCouleur(props: BarShapeProps) {
  const payload = props.payload as BarreAvecCouleur | undefined
  return <Rectangle {...props} fill={payload?.fill ?? chartTheme.series.primary} />
}

export function DistributionBarChart({ barres, unit = '' }: Readonly<{ barres: readonly BarreRepartition[]; unit?: string }>) {
  if (barres.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Aucune donnée à représenter.</p>
    )
  }

  const data: BarreAvecCouleur[] = [...barres]
    .sort((a, b) => b.valeur - a.valeur)
    .map((b, i) => ({ ...b, fill: COULEURS[i % COULEURS.length]! }))

  return (
    <div className="px-2 py-4">
      <div aria-hidden="true" className="h-[220px] w-full sm:h-[260px]">
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
            <Bar dataKey="valeur" shape={BarreCouleur} radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
