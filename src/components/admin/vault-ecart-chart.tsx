'use client'

import { chartTheme } from '@/lib/chart-theme'
import {
  Bar,
  BarChart,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * « De combien chaque poche s'écarte-t-elle de sa cible ? »
 *
 * Le tableau d'écarts, juste en dessous, donne les chiffres exacts. Ce
 * graphique ne les répète pas : il donne la seule chose qu'une colonne de
 * nombres ne donne pas — le SENS et l'AMPLEUR relative de l'écart, lus d'un
 * coup d'œil sur un axe centré sur zéro. Chiffres au tableau, forme au
 * graphique : chacun son travail.
 *
 * ── Pourquoi un axe symétrique à borne minimale ────────────────────────────
 * Un axe auto-ajusté rendrait un écart de 0,68 point aussi spectaculaire qu'un
 * écart de 15 points : la barre remplirait le cadre dans les deux cas. Sur un
 * produit financier, ce cadrage se lit comme une alerte là où il n'y en a pas.
 * L'axe est donc symétrique (un écart de +2 et un écart de -2 ont exactement la
 * même longueur) et borné à ±3 points au minimum, pour que les petits écarts
 * RESSEMBLENT à de petits écarts.
 *
 * ── Pourquoi une bande de tolérance dessinée ───────────────────────────────
 * La bande grise ±1 point matérialise le seuil déjà utilisé par la lecture
 * d'écart de cette page. Sans elle, le lecteur n'a aucun moyen de savoir à
 * partir de quand une barre mérite son attention.
 *
 * La couleur ne porte jamais seule l'information : chaque poche est accompagnée
 * de son mot d'état (`mot`), rendu dans l'infobulle et dans le tableau lisible
 * par un lecteur d'écran.
 */

export type NiveauEcart = 'conforme' | 'modere' | 'a-corriger'

export type EcartPoche = {
  readonly poche: string
  readonly label: string
  /** Écart signé, en points de pourcentage : constatée moins cible. */
  readonly ecart: number
  readonly niveau: NiveauEcart
  /** Le mot qui dit l'état — la teinte ne fait que le redoubler. */
  readonly mot: string
}

const COULEUR: Record<NiveauEcart, string> = {
  conforme: chartTheme.series.success,
  modere: chartTheme.series.secondary,
  'a-corriger': chartTheme.series.warning,
}

/** Sous ce seuil, l'écart est dans la tolérance : la bande le montre. */
const TOLERANCE_PT = 1

/** Aucun axe plus resserré que ±3 pt : voir la note de cadrage ci-dessus. */
const BORNE_MINIMALE_PT = 3

function pointsLisibles(valeur: number): string {
  const signe = valeur > 0 ? '+' : ''
  return `${signe}${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`
}

function InfoBulle({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: EcartPoche }[] }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const poche = payload[0]?.payload
  if (poche === undefined) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{poche.label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">{pointsLisibles(poche.ecart)}</p>
      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{poche.mot}</p>
    </div>
  )
}

export function VaultEcartChart({ ecarts }: Readonly<{ ecarts: readonly EcartPoche[] }>) {
  if (ecarts.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Aucun écart n’a pu être lu sur la chaîne. Rien n’est tracé plutôt qu’une barre à zéro, qui se lirait
        « poche parfaitement alignée ».
      </p>
    )
  }

  const amplitude = Math.max(...ecarts.map((e) => Math.abs(e.ecart)))
  const borne = Math.max(BORNE_MINIMALE_PT, Math.ceil(amplitude))
  // Une ligne par poche, jamais moins haut qu'un cadre lisible.
  const hauteur = Math.max(150, ecarts.length * 52 + 44)

  return (
    <div className="px-2 py-4">
      {/* Le tableau n'est pas un doublon du graphique : c'est sa seule version
          lisible au clavier et par un lecteur d'écran. Masqué à l'œil, jamais
          à l'assistance. */}
      <table className="sr-only">
        <caption>Écart entre allocation constatée et allocation visée, par poche, en points de pourcentage</caption>
        <thead>
          <tr>
            <th scope="col">Poche</th>
            <th scope="col">Écart</th>
            <th scope="col">État</th>
          </tr>
        </thead>
        <tbody>
          {ecarts.map((e) => (
            <tr key={e.poche}>
              <th scope="row">{e.label}</th>
              <td>{pointsLisibles(e.ecart)}</td>
              <td>{e.mot}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="w-full" style={{ height: hauteur }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...ecarts]} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            {/* La bande de tolérance est dessinée AVANT les barres : elle est un
                fond de lecture, pas une série. */}
            <ReferenceArea
              x1={-TOLERANCE_PT}
              x2={TOLERANCE_PT}
              fill={chartTheme.series.ghost}
              fillOpacity={0.14}
              ifOverflow="hidden"
            />
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
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <ReferenceLine x={0} stroke={chartTheme.tick} strokeOpacity={0.45} />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation coupée, comme partout dans la console : une barre qui
                pousse depuis zéro retarde la lecture et laisse une capture
                d'écran sur un graphique vide. */}
            <Bar dataKey="ecart" radius={2} maxBarSize={22} isAnimationActive={false}>
              {ecarts.map((e) => (
                <Cell key={e.poche} fill={COULEUR[e.niveau]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 px-3 text-xs text-zinc-500 dark:text-zinc-400">
        Bande grise : tolérance de ±{TOLERANCE_PT} point. À droite de zéro, la poche est en avance sur sa cible ;
        à gauche, elle est en retard.
      </p>
    </div>
  )
}
