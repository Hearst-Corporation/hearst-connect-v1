'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * « Le portefeuille a-t-il dérivé de sa cible, et de quel côté ? »
 *
 * Le graphique cible-vs-réel répond à « où est l'argent » ; il ne dit pas d'un
 * coup d'œil QUELLE poche décroche. La dérive, elle, est un écart signé : une
 * barre partant de zéro vers la gauche (sous-allouée) ou vers la droite
 * (sur-allouée) se lit sans comparer deux hauteurs.
 *
 * L'unité affichée est le POINT de pourcentage (bps / 100), parce que c'est
 * ainsi que la dérive se discute en comité — « deux points sous la cible » —
 * et non en points de base.
 *
 * Le backend n'expose AUCUNE tolérance contractuelle de rééquilibrage. Le seuil
 * ci-dessous est donc un seuil de LECTURE, assumé comme tel et annoncé dans le
 * cadre du graphique : il colore, il ne prétend pas être une règle du contrat.
 */

/** Écart à partir duquel une poche est signalée. Seuil de lecture, pas de contrat. */
export const SEUIL_DERIVE_ATTENTION_BPS = 200
/** Au-delà, l'écart cesse d'être une observation et devient une décision. */
export const SEUIL_DERIVE_CRITIQUE_BPS = 500

export type PocheDerive = {
  readonly poche: string
  readonly libelle: string
  readonly deriveBps: number
}

type BarreDerive = {
  readonly poche: string
  readonly libelle: string
  readonly points: number
  readonly attention: boolean
}

function pointsLisibles(points: number): string {
  const signe = points > 0 ? '+' : ''
  return `${signe}${points.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`
}

function InfoBulle({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: BarreDerive }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const barre = payload[0]?.payload
  if (barre === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{barre.libelle}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
        {pointsLisibles(barre.points)} {barre.points < 0 ? 'sous la cible' : 'au-dessus de la cible'}
      </p>
    </div>
  )
}

export function AccueilDeriveChart({ poches }: Readonly<{ poches: readonly PocheDerive[] }>) {
  if (poches.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Aucune dérive lisible. Rien n’est tracé plutôt qu’une barre à zéro, qui se lirait « poche parfaitement
        alignée ».
      </p>
    )
  }

  const barres: BarreDerive[] = poches.map((p) => ({
    poche: p.poche,
    libelle: p.libelle,
    points: p.deriveBps / 100,
    attention: Math.abs(p.deriveBps) >= SEUIL_DERIVE_ATTENTION_BPS,
  }))

  // Axe symétrique autour de zéro : sans cela, une seule poche en dérive
  // négative occuperait toute la largeur et paraîtrait catastrophique.
  const amplitude = Math.max(1, ...barres.map((b) => Math.abs(b.points)))
  const borne = Math.ceil(amplitude * 1.25 * 10) / 10

  return (
    <div className="px-2 py-4">
      {/* Seule version lisible au lecteur d'écran et au clavier. */}
      <table className="sr-only">
        <caption>Écart entre allocation constatée et allocation visée, par poche, en points de pourcentage</caption>
        <thead>
          <tr>
            <th scope="col">Poche</th>
            <th scope="col">Écart</th>
            <th scope="col">Lecture</th>
          </tr>
        </thead>
        <tbody>
          {barres.map((b) => (
            <tr key={b.poche}>
              <th scope="row">{b.libelle}</th>
              <td>{pointsLisibles(b.points)}</td>
              <td>{b.attention ? 'à surveiller' : 'dans la marge de lecture'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-[200px] w-full sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barres} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
            <XAxis
              type="number"
              domain={[-borne, borne]}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" pt"
            />
            <YAxis
              type="category"
              dataKey="poche"
              width={40}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine x={0} stroke={chartTheme.series.reference} strokeWidth={1} />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation coupée, comme partout dans la console : une barre qui
                pousse depuis zéro retarde la lecture sans rien apprendre. */}
            <Bar dataKey="points" radius={2} maxBarSize={18} isAnimationActive={false}>
              {barres.map((b) => (
                <Cell
                  key={b.poche}
                  fill={b.attention ? chartTheme.series.warning : chartTheme.series.primary}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* La couleur ne porte jamais seule l'information : la légende nomme le
          seuil, et le tableau ci-dessus donne la lecture poche par poche. */}
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: chartTheme.series.primary }}
          />
          Dans la marge de lecture
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: chartTheme.series.warning }}
          />
          À surveiller — écart d’au moins {SEUIL_DERIVE_ATTENTION_BPS / 100} pt
        </li>
      </ul>
    </div>
  )
}
