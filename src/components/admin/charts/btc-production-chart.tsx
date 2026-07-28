'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * « À quelle cadence le bitcoin est-il produit ? »
 *
 * ── Pourquoi des barres, et jamais une courbe ─────────────────────────────
 * Le service relève la production PAR MOIS : chaque mois est une quantité
 * close, mesurée, indépendante de la suivante. Une courbe relierait ces
 * relevés par un segment, et ce segment se lirait comme une progression
 * observée entre les deux dates — une affirmation que personne n'a mesurée.
 * Des barres n'affirment que ce qui a été relevé.
 *
 * ── Pourquoi la même forme à 1, 2 ou N mois ───────────────────────────────
 * La tentation serait de changer de rendu selon le nombre de points. C'est le
 * contraire qu'il faut : la barre est juste dès le premier mois — une barre
 * seule est un mois mesuré, pas une tendance amputée — et le reste juste
 * quand la série s'allonge. Ce qui change, c'est la PHRASE sous le graphique,
 * qui nomme ce qui est réellement lisible : un mois n'autorise aucune
 * évolution, deux mois donnent un écart et pas encore une tendance, trois et
 * plus se lisent barre à barre.
 *
 * ── Sur l'unité ───────────────────────────────────────────────────────────
 * L'axe est en BTC, lisible d'un coup d'œil. Le chiffre exact au satoshi près
 * reste accessible à l'infobulle et dans le tableau lu par les assistances :
 * l'arrondi de l'axe ne remplace jamais la mesure.
 */

export type MoisProduction = {
  /** Clé stable du mois, telle que renvoyée par le service (« 2026-07 »). */
  readonly periode: string
  /** Le même mois, dit en français (« juil. 2026 »). */
  readonly libelle: string
  /** Production du mois, en BTC — sert uniquement à l'échelle du graphique. */
  readonly btc: number
  /** Production du mois au satoshi près, déjà formatée sans perte. */
  readonly btcExact: string
  /** Cumul à la fin de ce mois, au satoshi près. `null` si non transmis. */
  readonly cumulExact: string | null
}

type LigneInfoBulle = { readonly payload?: MoisProduction }

function InfoBulle({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly LigneInfoBulle[] }>) {
  const mois = payload?.[0]?.payload
  if (active !== true || mois === undefined) return null

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{mois.libelle}</p>
      <p className="mt-1 text-zinc-600 tabular-nums dark:text-zinc-300">Produit ce mois : {mois.btcExact} BTC</p>
      {mois.cumulExact === null ? null : (
        <p className="mt-0.5 text-zinc-500 tabular-nums dark:text-zinc-400">
          Cumul à cette date : {mois.cumulExact} BTC
        </p>
      )}
    </div>
  )
}

/**
 * Ce que la légende a le droit d'affirmer, selon le nombre de mois relevés.
 * Un lecteur qui voit une barre unique lui prêtera spontanément une tendance
 * s'il n'est pas détrompé — cette phrase est là pour le détromper.
 */
function phraseLisibilite(mois: readonly MoisProduction[]): string {
  const premier = mois[0]
  const dernier = mois[mois.length - 1]

  if (mois.length === 1) {
    return `Un seul mois est relevé à ce jour (${premier?.libelle ?? '—'}). La barre dit ce qui a été produit sur ce mois : aucune évolution n’est encore mesurable.`
  }
  if (mois.length === 2) {
    return `Deux mois sont relevés. L’écart entre les deux barres se lit, mais deux relevés ne font pas encore une tendance.`
  }
  return `${mois.length} mois relevés, de ${premier?.libelle ?? '—'} à ${dernier?.libelle ?? '—'}. L’évolution se lit barre à barre, chaque barre restant une mesure de son mois.`
}

/** Un axe en BTC : trois décimales suffisent à situer, pas à affirmer. */
function graduation(valeur: number): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
}

export function ProductionMensuelleChart({
  mois,
  cumulBtc,
}: Readonly<{ mois: readonly MoisProduction[]; cumulBtc: string | null }>) {
  if (mois.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Aucun mois de production n’est lisible dans les relevés. Rien n’est tracé plutôt qu’une barre à zéro.
      </p>
    )
  }

  return (
    <div className="px-2 py-4">
      {/* Seule version lisible au lecteur d'écran et au clavier. Elle porte le
          chiffre au satoshi près, que l'axe arrondit. */}
      <table className="sr-only">
        <caption>Bitcoin produit par mois relevé, et cumul à la fin de chaque mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Produit sur le mois</th>
            <th scope="col">Cumul à la fin du mois</th>
          </tr>
        </thead>
        <tbody>
          {mois.map((m) => (
            <tr key={m.periode}>
              <th scope="row">{m.libelle}</th>
              <td>{m.btcExact} BTC</td>
              <td>{m.cumulExact === null ? 'non transmis' : `${m.cumulExact} BTC`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-[200px] w-full sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...mois]} margin={{ top: 6, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis dataKey="libelle" tick={{ fill: chartTheme.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              unit=" BTC"
              tickFormatter={graduation}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            {/* `maxBarSize` compte surtout au premier mois : sans lui, une barre
                seule occuperait toute la largeur et se lirait comme un total,
                pas comme un point de série. Animation coupée, comme partout
                dans la console : un mouvement retarde la lecture et piège les
                captures d'écran. */}
            <Bar
              dataKey="btc"
              name="Produit sur le mois"
              fill={chartTheme.series.primaryFill}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 px-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {phraseLisibilite(mois)}
        {cumulBtc === null ? null : (
          <>
            {' '}
            Cumul transmis par le service depuis l’origine : <span className="tabular-nums">{cumulBtc} BTC</span>.
          </>
        )}
      </p>
    </div>
  )
}
