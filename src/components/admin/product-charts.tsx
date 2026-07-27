'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
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

const PRIMARY = 'var(--color-zinc-950)'
const SECONDARY = 'var(--color-zinc-500)'
const ACCENT = 'var(--color-accent-500)'
const GRILLE = 'var(--color-zinc-300)'
const AXE = 'var(--color-zinc-600)'

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
    <div className="text-metadata shadow-panel border border-zinc-300 bg-white px-3 py-2">
      <p className="font-medium text-black">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-zinc-700 tabular-nums">
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
    <div className="py-6">
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
              <linearGradient id="degradePrimaire" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.18} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.01} />
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
              stroke={PRIMARY}
              strokeWidth={2}
              fill="url(#degradePrimaire)"
              dot={{ r: 3, fill: PRIMARY, strokeWidth: 0 }}
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

function BarrePoste(props: BarShapeProps) {
  const payload = props.payload as PosteBitcoin | undefined
  return <Rectangle {...props} fill={payload?.accent ? ACCENT : SECONDARY} />
}

/** « Combien dort en réserve, combien travaille en exposition ? » */
export function ReserveExpositionChart({ postes }: Readonly<{ postes: readonly PosteBitcoin[] }>) {
  return (
    <div className="py-6">
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
            <Tooltip content={<Bulle suffixe="$" />} cursor={{ fill: 'var(--color-zinc-100)' }} />
            <Bar
              dataKey="montant"
              name="Montant"
              shape={BarrePoste}
              radius={0}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
