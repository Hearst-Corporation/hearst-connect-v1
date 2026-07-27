'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * « L'argent est-il placé là où il devrait l'être ? »
 *
 * Le graphique compare, poche par poche, l'allocation VISÉE par le contrat et
 * celle CONSTATÉE sur la chaîne. C'est la seule question qu'il pose, et son
 * titre la pose telle quelle.
 *
 * Deux barres côte à côte plutôt qu'une part de camembert : l'écart entre la
 * cible et le réel est ce qui déclenche un rééquilibrage, et un camembert le
 * rend invisible. L'échelle est en points de pourcentage, jamais en points de
 * base bruts — personne ne lit 2 700 comme « vingt-sept pour cent ».
 *
 * Aucune valeur n'est fabriquée : une poche dont le solde n'a pas pu être lu
 * n'apparaît pas avec un zéro, elle est écartée par l'appelant et signalée.
 */

export type PocheAllocation = {
  readonly poche: string
  readonly cible: number
  readonly reel: number | null
}

const TARGET = 'var(--color-zinc-400)'
const ACTUAL = 'var(--color-zinc-950)'

function InfoBulle({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { name?: string; value?: number }[]; label?: string }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  return (
    <div className="text-metadata shadow-panel border border-zinc-300 bg-white px-3 py-2">
      <p className="font-medium text-black">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-700 tabular-nums">
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
      <p className="text-label py-10 text-center text-zinc-600">
        Aucun solde de poche n’a pu être lu sur la chaîne. Rien n’est tracé plutôt qu’une répartition à zéro.
      </p>
    )
  }

  return (
    <div className="py-6">
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

      <div aria-hidden="true" className="text-metadata mb-4 flex flex-wrap gap-5 text-zinc-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 bg-zinc-400" />
          Visée
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1 w-5 bg-black" />
          Constatée
        </span>
      </div>
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...lisibles]} margin={{ top: 4, right: 8, bottom: 4, left: -16 }} barGap={2}>
            <CartesianGrid stroke="var(--color-zinc-300)" vertical={false} />
            <XAxis
              dataKey="poche"
              tick={{ fill: 'var(--color-zinc-600)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-zinc-600)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" %"
              width={52}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: 'var(--color-zinc-100)' }} />
            {/* Animation coupée : une barre qui pousse depuis zéro n'apprend
                rien à une équipe d'opérations, retarde la lecture, et laisse
                une capture d'écran sur un graphique vide. */}
            <Bar dataKey="cible" name="Visée" fill={TARGET} radius={0} maxBarSize={26} isAnimationActive={false} />
            <Bar dataKey="reel" name="Constatée" fill={ACTUAL} radius={0} maxBarSize={26} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
