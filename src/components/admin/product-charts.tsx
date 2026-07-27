'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Graphiques de la surface Produit.
 *
 * Chacun répond à UNE question, posée telle quelle dans son titre par le cadre
 * appelant. Aucun n'invente de point : quand la série manque, l'appelant rend
 * l'état d'attente du cadre plutôt qu'une courbe plate qui se lirait comme une
 * mesure réelle à zéro.
 *
 * Animations coupées partout : dans une console d'exploitation, un mouvement
 * retarde la lecture sans rien apprendre, et il piège les captures d'écran.
 */

const OR = '#c6a94e'
const BLEU = '#60a5fa'
const GRILLE = '#2e3c59'
const AXE = '#94a3b8'

function Bulle({
  active,
  payload,
  label,
  suffixe,
}: Readonly<{
  active?: boolean
  payload?: readonly { name?: string; value?: number }[]
  label?: string | number
  suffixe: string
}>) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-white/10 bg-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-300 tabular-nums">
          {p.name} : {typeof p.value === 'number' ? `${p.value.toLocaleString('fr-FR')} ${suffixe}` : '—'}
        </p>
      ))}
    </div>
  )
}

/* ── Courbe de rémunération ──────────────────────────────────────────────── */

export type PointCourbe = { readonly mois: number; readonly taux: number }

/** « Comment la rémunération évolue-t-elle sur la durée du produit ? » */
export function VendingCurveChart({ points }: Readonly<{ points: readonly PointCourbe[] }>) {
  return (
    <div className="px-2 py-4">
      <table className="sr-only">
        <caption>Taux de rémunération par mois, en pourcentage</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Taux</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.mois}>
              <th scope="row">Mois {p.mois}</th>
              <td>{p.taux.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...points]} margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
            <defs>
              <linearGradient id="degradeOr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={OR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={OR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRILLE} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fill: AXE, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(m: number) => `M${m}`}
            />
            <YAxis tick={{ fill: AXE, fontSize: 11 }} tickLine={false} axisLine={false} unit=" %" width={52} />
            <Tooltip content={<Bulle suffixe="%" />} cursor={{ stroke: GRILLE }} />
            {/* Pas de `type="monotone"` : un lissage inventerait des valeurs
                entre deux mois mesurés. La ligne relie les points, rien de plus. */}
            <Area
              type="linear"
              dataKey="taux"
              name="Taux"
              stroke={OR}
              strokeWidth={2}
              fill="url(#degradeOr)"
              dot={{ r: 3, fill: OR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Réserve et exposition ───────────────────────────────────────────────── */

export type PosteBitcoin = { readonly poste: string; readonly montant: number; readonly accent: boolean }

/** « Combien dort en réserve, combien travaille en exposition ? » */
export function ReserveExpositionChart({ postes }: Readonly<{ postes: readonly PosteBitcoin[] }>) {
  return (
    <div className="px-2 py-4">
      <table className="sr-only">
        <caption>Répartition entre réserve et exposition, en dollars</caption>
        <thead>
          <tr>
            <th scope="col">Poste</th>
            <th scope="col">Montant</th>
          </tr>
        </thead>
        <tbody>
          {postes.map((p) => (
            <tr key={p.poste}>
              <th scope="row">{p.poste}</th>
              <td>{p.montant.toLocaleString('fr-FR')} $</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...postes]} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={GRILLE} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: AXE, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 1000)} k$`}
            />
            <YAxis
              type="category"
              dataKey="poste"
              tick={{ fill: AXE, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<Bulle suffixe="$" />} cursor={{ fill: '#ffffff0a' }} />
            <Bar dataKey="montant" name="Montant" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
              {postes.map((p) => (
                <Cell key={p.poste} fill={p.accent ? OR : BLEU} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
