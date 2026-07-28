'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * « L'argent est-il placé là où il devrait l'être ? »
 *
 * Le graphique compare, poche par poche, l'allocation VISÉE par le contrat et
 * celle CONSTATÉE sur la chaîne.
 */

export type PocheAllocation = {
  readonly poche: string
  readonly cible: number
  readonly reel: number | null
}

const MINT = chartTheme.series.primary
const BLEU = chartTheme.series.reference

function InfoBulle({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { name?: string; value?: number }[]; label?: string }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-300 tabular-nums">
          {p.name} : {typeof p.value === 'number' ? `${p.value.toFixed(1)} %` : '—'}
        </p>
      ))}
    </div>
  )
}

export function AllocationChart({ poches }: Readonly<{ poches: readonly PocheAllocation[] }>) {
  const lisibles = poches.filter((p) => p.reel !== null)

  if (lisibles.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500">
        Aucun solde de poche n’a pu être lu sur la chaîne. Rien n’est tracé plutôt qu’une répartition à zéro.
      </p>
    )
  }

  return (
    <div className="px-2 py-4">
      {/* Le tableau sous le graphique n'est pas un doublon : c'est la seule
          version lisible par un lecteur d'écran, et la seule utilisable au
          clavier. Il est masqué à l'œil, jamais à l'assistance. */}
      <table className="sr-only">
        <caption>Allocation visée et allocation constatée, par poche, en pourcentage</caption>
        <thead>
          <tr>
            <th scope="col">Poche</th>
            <th scope="col">Visée</th>
            <th scope="col">Constatée</th>
          </tr>
        </thead>
        <tbody>
          {lisibles.map((p) => (
            <tr key={p.poche}>
              <th scope="row">{p.poche}</th>
              <td>{p.cible.toFixed(1)} %</td>
              <td>{p.reel === null ? 'non lisible' : `${p.reel.toFixed(1)} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...lisibles]} margin={{ top: 4, right: 8, bottom: 4, left: -16 }} barGap={2}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="poche" tick={{ fill: chartTheme.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" %"
              width={52}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.tick }} iconType="circle" iconSize={7} />
            {/* Animation coupée : une barre qui pousse depuis zéro n'apprend
                rien à une équipe d'opérations, retarde la lecture, et laisse
                une capture d'écran sur un graphique vide. */}
            <Bar
              dataKey="cible"
              name="Visée"
              fill={BLEU}
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
            <Bar
              dataKey="reel"
              name="Constatée"
              fill={MINT}
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
