'use client'

import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { HearstActivityChart, HearstLineChart, HearstStackedBarChart, type StackSeries } from '@/components/charts'
import { formatNumber, formatPercent } from '@/lib/format'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Les deux courbes du book, côté client : leurs formats d'axe sont des
 * fonctions, qui ne traversent pas la frontière serveur → client.
 *
 * Chaque graphique porte en tête LE chiffre qu'il raconte — l'AUM du jour et sa
 * variation, le rendement cumulé — pour que la courbe se lise comme sa preuve,
 * pas comme une énigme.
 */

const usdCompact = (v: number) => `$${formatNumber(v, { notation: 'compact', maximumFractionDigits: 1 })}`

function Headline({
  value,
  caption,
  delta,
  flush = false,
}: Readonly<{ value: string; caption: string; delta?: number | null; flush?: boolean }>) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta)
  return (
    <div className={`${flush ? '' : 'mb-4 '}flex flex-wrap items-baseline gap-x-3 gap-y-1`}>
      <span className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums text-fg">
        {value}
      </span>
      {hasDelta ? (
        <span
          className={`text-sm font-medium tabular-nums ${delta >= 0 ? 'text-[var(--hearst-green-text)]' : 'text-amber-400'}`}
        >
          {formatPercent(delta, { maximumFractionDigits: 1, signed: true })}
        </span>
      ) : null}
      <span className="text-xs text-fg-tertiary">{caption}</span>
    </div>
  )
}

export type AumPoint = { readonly at: string; readonly aum: number }

/** L'AUM total, jour par jour : une mesure qui existe à chaque instant → une courbe. */
export function AumHistoryChart({ points }: Readonly<{ points: readonly AumPoint[] }>) {
  if (points.length < 2) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">Not enough history to draw a trend yet.</p>
  }
  const first = points[0].aum
  const last = points[points.length - 1].aum
  const delta = first > 0 ? ((last - first) / first) * 100 : null
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    /* Le graphe prend toute la hauteur de sa carte : à côté d'une carte plus
       haute, il ne laisse plus de vide sous la courbe. */
    <div className="flex h-full min-w-0 flex-col">
      <Headline value={usdCompact(last)} delta={delta} caption={`over ${points.length} days`} />
      <FillHeight>
        {(h) => (
          <HearstLineChart
            points={points.map((p) => ({ id: p.at, label: day(p.at), value: p.aum, detail: day(p.at) }))}
            unit="USD"
            yTickFormatter={usdCompact}
            height={h}
          />
        )}
      </FillHeight>
    </div>
  )
}

export type ReservePoint = { readonly month: string; readonly btc: number }

/**
 * Les réserves de bitcoin des clients, mois par mois : les dépôts convertis à
 * l'ouverture de chaque vault, plus ce que les trois poches y ont ajouté.
 */
export function ReserveHistoryChart({ points }: Readonly<{ points: readonly ReservePoint[] }>) {
  if (points.length < 2) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">Not enough history to draw a trend yet.</p>
  }
  const last = points[points.length - 1].btc
  const label = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  /* Pas de « +x % » : la courbe monte d'abord parce que des vaults s'ouvrent —
     un pourcentage depuis le premier vault ne mesurerait rien. */
  return (
    <div className="flex h-full min-w-0 flex-col">
      <Headline value={`${formatBtcValue(last)} BTC`} caption={`today · over ${points.length} months, as vaults opened and the buckets added bitcoin`} />
      {/* Des BARRES, une par mois : la réserve monte par paliers (un vault qui
          s'ouvre apporte d'un coup son dépôt converti), et une courbe lissée
          inventait des creux et des bosses entre deux paliers. */}
      <FillHeight>
        {(h) => (
          <HearstActivityChart
            points={points.map((p) => ({ label: label(p.month), value: p.btc, detail: label(p.month) }))}
            unit="BTC"
            yTickFormatter={(v: number) => formatNumber(v, { maximumFractionDigits: 0 })}
            height={h}
          />
        )}
      </FillHeight>
    </div>
  )
}

/* Les couleurs du produit : le vert pour ce que le minage apporte, deux gris
   pour le prêt et l'USDC — les mêmes que la proposition et /account. */
export const BUCKET_SERIES: readonly StackSeries[] = [
  { key: 'USDC Yield', label: 'USDC Yield', color: '#a9a9a9' },
  { key: 'Bitcoin Lending', label: 'Bitcoin Lending', color: '#6b6b6b' },
  { key: 'Mining Alpha', label: 'Mining Alpha', color: '#9eea7a' },
]

/* V2 : le dépôt loue de la puissance de calcul — il n'est pas dans la réserve. La réserve,
   c'est le bitcoin produit par le minage, net d'électricité et des frais Hearst. */
const RESERVE_SERIES: readonly StackSeries[] = [{ key: 'accumulated', label: 'Produced by mining, net of fees', color: '#9eea7a' }]

export type ClientShare = { readonly label: string; readonly value: number }
export type ReserveSplitPoint = {
  readonly month: string
  readonly deposits: number
  readonly accumulated: number
  /** La réserve de chaque client à ce mois — montrée au survol. */
  readonly byClient?: readonly ClientShare[]
}

/**
 * La réserve des clients, mois par mois : le bitcoin que le minage a produit pour eux,
 * net d'électricité et des frais Hearst. `deposits` reste dans la forme mais vaut 0 en V2.
 */
export function ReserveCompositionChart({
  points,
  breakdownTitle = 'Reserve by client',
  wide = false,
}: Readonly<{ points: readonly ReserveSplitPoint[]; breakdownTitle?: string; wide?: boolean }>) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No vault open yet.</p>
  }
  const last = points[points.length - 1]
  const total = last.accumulated
  const label = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  return (
    <div className="flex h-full min-w-0 flex-col">
      <Headline
        value={`${formatBtcValue(total)} BTC`}
        caption="Produced by mining since the deposits, after electricity and Hearst fees"
      />
      <FillHeight>
        {(h) => (
          <HearstStackedBarChart
            points={points.map((p) => ({
              label: label(p.month),
              detail: label(p.month),
              values: { accumulated: p.accumulated },
              breakdown: p.byClient,
              breakdownTitle,
            }))}
            series={RESERVE_SERIES}
            unit="BTC"
            height={h}
            wide={wide}
            format={(v) => `${formatBtcValue(v)} BTC`}
            yTickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 0 })}
          />
        )}
      </FillHeight>
    </div>
  )
}

export type BucketMonth = {
  readonly month: string
  readonly usd: number
  readonly buckets: Readonly<Record<string, number>>
  /** Ce que chaque client a reçu ce mois-là — montré au survol (tableau de bord). */
  readonly byClient?: readonly ClientShare[]
}

/**
 * Ce que chaque poche ajoute à la réserve, mois par mois, en bitcoin. La
 * question que pose le produit : QUEL bucket nourrit la réserve, et comment ça
 * évolue. 6 mois par défaut, 12 ou tout l'historique.
 */
export function BucketsByMonthChart({ months: all }: Readonly<{ months: readonly BucketMonth[] }>) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('6')
  if (all.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No bitcoin added yet.</p>
  }
  const span = RANGES.find((r) => r.id === range)?.months ?? 6
  const months = Number.isFinite(span) ? all.slice(-span) : all
  const btc = months.reduce((t, m) => t + Object.values(m.buckets).reduce((a, b) => a + b, 0), 0)
  const usd = months.reduce((t, m) => t + m.usd, 0)
  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  const share = (key: string) => {
    const v = months.reduce((t, m) => t + (m.buckets[key] ?? 0), 0)
    return btc > 0 ? (v / btc) * 100 : 0
  }
  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Le total et sa phrase, puis le sélecteur sur SA ligne, à égale
          distance de la phrase au-dessus et de la légende en dessous. */}
      <Headline
        flush
        value={`${formatBtcValue(btc)} BTC`}
        caption={`added over ${months.length} months · ${BUCKET_SERIES.slice()
          .reverse()
          .map((s) => `${s.label} ${formatNumber(share(s.key), { maximumFractionDigits: 0 })} %`)
          .join(' · ')} · ≈ ${usdCompact(usd)}`}
      />
      <div className="my-4 flex justify-end">
        <div className="ud-seg" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === range}
              onClick={() => setRange(r.id)}
              className={`ud-seg-btn${r.id === range ? ' active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <FillHeight>
        {(h) => (
          <HearstStackedBarChart
            points={months.map((m) => ({
              label: monthLabel(m.month),
              detail: monthLabel(m.month),
              values: m.buckets,
              breakdown: m.byClient,
              breakdownTitle: 'Added by client',
            }))}
            series={BUCKET_SERIES}
            unit="BTC"
            height={h}
            format={(v) => `${formatBtcValue(v)} BTC`}
            yTickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 1 })}
          />
        )}
      </FillHeight>
    </div>
  )
}

export type YieldMonth = {
  readonly month: string
  readonly yieldUsdc: number
  readonly btc: number
}

/** Le rendement versé chaque mois : un montant clos par période → des barres. */
/**
 * Le bitcoin ajouté à une réserve, mois par mois. Le produit est une RÉSERVE
 * de bitcoin, pas un rendement en dollars : la fiche client se lit en BTC, la
 * valeur en dollars n'est qu'un repère.
 */
/** Mesure la hauteur disponible et la donne au graphe (qui veut des pixels).
 *  Les dates se posent sous la zone de tracé, dans le bas de la carte. */
function FillHeight({ children }: Readonly<{ children: (height: number | undefined) => ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | undefined>(undefined)
  useEffect(() => {
    const el = ref.current
    if (el === null) return
    const fit = () => setH(Math.max(160, el.clientHeight - 8))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="min-h-[200px] flex-1 pb-2">
      <div className="h-0 overflow-visible">{children(h)}</div>
    </div>
  )
}

const RANGES = [
  { id: '6', label: '6M', months: 6 },
  { id: '12', label: '12M', months: 12 },
  { id: 'all', label: 'All', months: Infinity },
] as const

export function BtcByMonthChart({ months: all }: Readonly<{ months: readonly YieldMonth[] }>) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('6')
  if (all.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No bitcoin added yet.</p>
  }
  /* Les N derniers mois — 6 par défaut, 12 ou tout l'historique du vault. */
  const span = RANGES.find((r) => r.id === range)?.months ?? 6
  const months = Number.isFinite(span) ? all.slice(-span) : all
  const btc = months.reduce((sum, m) => sum + m.btc, 0)
  const usd = months.reduce((sum, m) => sum + m.yieldUsdc, 0)
  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const btcTick = (v: number) => formatNumber(v, { maximumFractionDigits: 2 })

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Headline
          value={`${formatBtcValue(btc)} BTC`}
          caption={`added over ${months.length} months · ≈ ${usdCompact(usd)} at each month’s price`}
        />
        <div className="ud-seg" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === range}
              onClick={() => setRange(r.id)}
              className={`ud-seg-btn${r.id === range ? ' active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {/* Le graphe prend TOUTE la hauteur que la carte lui laisse : posée à
          côté d'un registre plus haut, elle ne garde plus de vide sous les barres. */}
      <FillHeight>
        {(h) => (
          <HearstActivityChart
            points={months.map((m) => ({ label: monthLabel(m.month), value: m.btc, detail: m.month }))}
            unit="BTC"
            yTickFormatter={btcTick}
            height={h}
          />
        )}
      </FillHeight>
    </div>
  )
}

export function YieldByMonthChart({ months }: Readonly<{ months: readonly YieldMonth[] }>) {
  if (months.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">No distribution recorded yet.</p>
  }
  const total = months.reduce((sum, m) => sum + m.yieldUsdc, 0)
  const btc = months.reduce((sum, m) => sum + m.btc, 0)
  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

  return (
    /* `pb-10` : le graphique pose ses dates SOUS sa zone de tracé ; sans
       cette marge, elles débordaient de la carte. */
    <div className="min-w-0 pb-10">
      <Headline
        value={usdCompact(total)}
        caption={`paid over ${months.length} months · ${formatNumber(btc, { maximumFractionDigits: 2 })} BTC produced`}
      />
      <HearstActivityChart
        points={months.map((m) => ({ label: monthLabel(m.month), value: m.yieldUsdc, detail: m.month }))}
        unit="USDC"
        yTickFormatter={usdCompact}
      />
    </div>
  )
}
