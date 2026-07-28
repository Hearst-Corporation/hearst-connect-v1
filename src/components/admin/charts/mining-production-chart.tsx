'use client'

import { chartTheme } from '@/lib/chart-theme'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * « Combien la flotte produit-elle, mois après mois ? »
 *
 * La seule série temporelle réelle du minage : le bitcoin attesté par le
 * contrat, agrégé par mois d'exploitation. Le service n'en publie aujourd'hui
 * qu'un seul point — la barre unique n'est pas un défaut de rendu, c'est
 * l'ampleur exacte de l'historique disponible, et l'appelant le dit en toutes
 * lettres sous le graphique.
 *
 * Aucune projection, aucun lissage : une barre = un mois réellement relevé.
 * Les libellés de période arrivent déjà formatés, pour que ce composant client
 * n'ait pas à refaire le travail du serveur.
 */

export type MoisProduit = {
  /** Période lisible, déjà mise en forme par la page (« juillet 2026 »). */
  readonly libelle: string
  readonly btc: number
}

const MINT = chartTheme.series.primary

function btcLisible(valeur: number): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 8 })
}

function InfoBulle({
  active,
  payload,
  label,
}: Readonly<{ active?: boolean; payload?: readonly { value?: number }[]; label?: string }>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const valeur = payload[0]?.value
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      <p className="mt-0.5 text-zinc-600 tabular-nums dark:text-zinc-300">
        {typeof valeur === 'number' ? `${btcLisible(valeur)} BTC` : '—'}
      </p>
    </div>
  )
}

export function MiningProductionChart({ mois }: Readonly<{ mois: readonly MoisProduit[] }>) {
  if (mois.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Le service répond, et son historique de production ne contient encore aucun mois. Rien n’est tracé plutôt
        qu’une barre à zéro.
      </p>
    )
  }

  return (
    <div className="px-2 py-4">
      {/* Le tableau n'est pas un doublon : c'est la seule version lisible au
          lecteur d'écran et au clavier. Masqué à l'œil, jamais à l'assistance. */}
      <table className="sr-only">
        <caption>Bitcoin produit par mois d’exploitation, attesté par le contrat</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Bitcoin produit</th>
          </tr>
        </thead>
        <tbody>
          {mois.map((m) => (
            <tr key={m.libelle}>
              <th scope="row">{m.libelle}</th>
              <td>{btcLisible(m.btc)} BTC</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...mois]} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid
              stroke={chartTheme.grid}
              strokeOpacity={chartTheme.gridOpacity}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="libelle"
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
            />
            <Tooltip content={<InfoBulle />} cursor={{ fill: chartTheme.cursor }} />
            {/* Animation coupée, comme partout dans la console : une barre qui
                pousse depuis zéro retarde la lecture et piège les captures. */}
            <Bar dataKey="btc" name="Bitcoin produit" fill={MINT} radius={[3, 3, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
