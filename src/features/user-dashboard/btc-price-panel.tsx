'use client'

import { useMemo, useState } from 'react'
import type { ChartViewportRole } from '@/components/charts/core/chart-theme'
import { HearstLineChart } from '@/components/charts/richart/line-chart'
import { formatNumber } from '@/lib/format'

/**
 * Cours du bitcoin, avec sélection de période.
 *
 * Les fenêtres découpent la série DÉJÀ REÇUE — aucun appel réseau au clic : le
 * backend publie un historique, on en montre la queue. Une fenêtre plus longue
 * que l'historique disponible se désactive plutôt que d'afficher une courbe
 * tronquée en la présentant comme « 12 mois ».
 *
 * Les points sont supposés ordonnés du plus ancien au plus récent, ce que fait
 * déjà `sortByLabelTime` dans le graphe lui-même.
 */

export type PricePoint = {
  readonly label: string
  readonly value: number
  readonly detail?: string
}

/**
 * Fenêtres en NOMBRE DE POINTS — la série est quotidienne côté backend.
 *
 * Les paliers suivent l'historique réellement publié (90 jours) : proposer
 * « 6 M » et « 12 M » sur trois mois de données laissait deux boutons morts,
 * grisés en permanence. Mieux vaut quatre fenêtres qui marchent que six dont
 * deux ne mènent nulle part.
 */
const WINDOWS = [
  { key: '1w', label: '1 W', points: 7 },
  { key: '1m', label: '1 M', points: 30 },
  { key: '3m', label: '3 M', points: 90 },
  { key: 'all', label: 'All', points: Number.POSITIVE_INFINITY },
] as const

type WindowKey = (typeof WINDOWS)[number]['key']

export function BtcPricePanel({
  points,
  viewport = 'hero',
}: Readonly<{
  points: readonly PricePoint[]
  /** `compact` dans le flanc (280px de large), `hero` en pleine largeur : une
   *  hauteur de graphe pleine page écrasait le sélecteur dans la colonne. */
  viewport?: ChartViewportRole
}>) {
  /* `period`, jamais `window` : nommer l'état `window` masque l'objet global du
     navigateur dans toute la portée du composant. */
  const [period, setPeriod] = useState<WindowKey>('all')

  const active = WINDOWS.find((w) => w.key === period) ?? WINDOWS[WINDOWS.length - 1]

  const shown = useMemo(() => {
    if (!Number.isFinite(active.points)) return points
    return points.slice(Math.max(0, points.length - active.points))
  }, [points, active.points])

  // Variation sur la fenêtre affichée, pas sur la série entière : le chiffre
  // doit répondre au bouton qu'on vient de presser.
  const first = shown[0]?.value ?? null
  const last = shown[shown.length - 1]?.value ?? null
  const changePct = first !== null && last !== null && first > 0 ? ((last - first) / first) * 100 : null

  return (
    <div className="btc-price-panel">
      <div className="btc-price-head">
        <p className="btc-price-value">
          {last !== null ? `$${formatNumber(last, { maximumFractionDigits: 0 })}` : '—'}
        </p>
        {changePct !== null ? (
          <p className={`btc-price-change${changePct >= 0 ? ' is-up' : ' is-down'}`}>
            {changePct >= 0 ? '+' : '−'}
            {formatNumber(Math.abs(changePct), { maximumFractionDigits: 1 })} %
            <span className="btc-price-change-note">over {active.label}</span>
          </p>
        ) : null}
      </div>

      <div className="btc-price-chart">
        <HearstLineChart points={[...shown]} unit="USD" viewport={viewport} />
      </div>

      {/* Une fenêtre plus longue que l'historique se DÉSACTIVE : proposer
          « 12 M » sur trois mois de données afficherait trois mois en le
          nommant douze. */}
      <div className="btc-price-windows" role="group" aria-label="Chart period">
        {WINDOWS.map((w) => {
          const enough = !Number.isFinite(w.points) || points.length >= w.points
          return (
            <button
              key={w.key}
              type="button"
              className={`btc-price-window${w.key === period ? ' active' : ''}`}
              aria-pressed={w.key === period}
              disabled={!enough}
              title={enough ? undefined : 'Not enough history for this period'}
              onClick={() => setPeriod(w.key)}
            >
              {w.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
