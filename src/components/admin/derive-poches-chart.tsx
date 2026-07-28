'use client'

import { chartTheme } from '@/lib/chart-theme'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * « Quelle poche s'écarte de sa cible, et dans quel sens ? »
 *
 * Le graphique d'allocation classique (visée vs constatée) répond à « où est
 * l'argent ». Sur une page d'opérations, la question n'est pas la même : elle
 * porte sur le GESTE à faire — quelle poche a dérivé, de combien, et dans quel
 * sens. C'est donc l'écart signé qui est tracé, autour d'une ligne de zéro,
 * et non deux barres à comparer à l'œil.
 *
 * Deux partis pris :
 *
 * 1. Une seule couleur. Une poche au-dessus de sa cible n'est ni meilleure ni
 *    pire qu'une poche en dessous : seule l'amplitude compte. Colorer le signe
 *    ferait passer un jugement que la donnée ne porte pas.
 * 2. L'échelle est symétrique autour de zéro. Un axe cadré sur les seules
 *    valeurs présentes exagérerait visuellement le plus petit des écarts.
 *
 * Aucun seuil de déclenchement n'est dessiné : le service n'en publie aucun.
 * Une ligne « seuil » inventée se lirait comme une règle de gestion.
 */

export type DerivePoche = {
  readonly poche: string
  /** Part visée par le contrat, en pourcentage. */
  readonly cible: number
  /** Part constatée sur la chaîne, en pourcentage. */
  readonly constate: number
  /** Écart signé constaté − visé, en points de pourcentage. */
  readonly ecart: number
}

const ACCENT = chartTheme.series.primary

function nombre(valeur: number): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function ecartSigne(valeur: number): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2, signDisplay: 'always' })
}

/** Le sens de l'écart, dit en toutes lettres — la couleur n'en dit rien. */
function sensEcart(valeur: number): string {
  if (valeur < 0) return 'sous la cible'
  if (valeur > 0) return 'au-dessus de la cible'
  return 'sur la cible'
}

/** Échelle symétrique, arrondie au dixième supérieur, jamais nulle. */
function marge(poches: readonly DerivePoche[]): number {
  let amplitude = 0
  for (const p of poches) {
    const absolu = Math.abs(p.ecart)
    if (absolu > amplitude) amplitude = absolu
  }
  return Math.max(Math.ceil(amplitude * 12) / 10, 0.1)
}

/**
 * Graduations imposées, et non laissées à la bibliothèque.
 *
 * Livrée à elle-même, recharts choisit un pas « rond » qui saute le zéro :
 * l'axe affichait −2,6 / −0,6 / 1,4 alors que le zéro est précisément la
 * référence que le lecteur cherche. On le force, avec deux graduations
 * symétriques de part et d'autre.
 */
function graduations(largeur: number): readonly number[] {
  return [-largeur, -largeur / 2, 0, largeur / 2, largeur]
}

function InfoBulle({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: DerivePoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const poche = payload[0]?.payload
  if (poche === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{poche.poche}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">Visée : {nombre(poche.cible)} %</p>
      <p className="text-zinc-600 tabular-nums dark:text-zinc-300">Constatée : {nombre(poche.constate)} %</p>
      <p className="mt-0.5 font-medium text-zinc-950 tabular-nums dark:text-white">
        Écart : {ecartSigne(poche.ecart)} pt
      </p>
    </div>
  )
}

export function DerivePochesChart({ poches }: Readonly<{ poches: readonly DerivePoche[] }>) {
  if (poches.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Aucun écart n’a pu être lu poche par poche. Rien n’est tracé plutôt qu’une dérive à zéro.
      </p>
    )
  }

  const donnees = [...poches]
  const largeur = marge(poches)

  return (
    <div className="px-2 py-4">
      {/* Seule version lisible au lecteur d'écran et au clavier : le graphique
          lui-même est décoratif, la table porte les chiffres. */}
      <table className="sr-only">
        <caption>
          Écart entre allocation visée et allocation constatée, par poche, en points de pourcentage
        </caption>
        <thead>
          <tr>
            <th scope="col">Poche</th>
            <th scope="col">Visée</th>
            <th scope="col">Constatée</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {poches.map((p) => (
            <tr key={p.poche}>
              <th scope="row">{p.poche}</th>
              <td>{nombre(p.cible)} %</td>
              <td>{nombre(p.constate)} %</td>
              <td>{ecartSigne(p.ecart)} points</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-[200px] w-full sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-largeur, largeur]}
              ticks={[...graduations(largeur)]}
              // Décimale française : la bibliothèque écrirait « -2.6 ».
              tickFormatter={(valeur: number) => `${nombre(valeur)} pt`}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="poche"
              width={110}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            {/* La cible, matérialisée : à gauche du trait, la poche est sous sa
                cible ; à droite, au-dessus. */}
            <ReferenceLine x={0} stroke={chartTheme.series.reference} strokeWidth={1} />
            {/* Animation coupée : cohérent avec les autres graphiques de la
                console, et une capture d'écran ne part pas d'un graphe vide. */}
            <Bar dataKey="ecart" fill={ACCENT} radius={2} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* La couleur ne dit rien du signe : les valeurs sont écrites. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-3 text-xs text-zinc-500 dark:text-zinc-400">
        {poches.map((p) => (
          <li key={p.poche} className="tabular-nums">
            <span className="text-zinc-700 dark:text-zinc-300">{p.poche}</span> {ecartSigne(p.ecart)} pt
            <span className="text-zinc-500 dark:text-zinc-500"> ({sensEcart(p.ecart)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
