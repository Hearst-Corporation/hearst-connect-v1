'use client'

import { useState } from 'react'
import { formatNumber, formatPercent } from '@/lib/format'
import type { VaultProjection } from './load'

/**
 * Projection du vault, en tableau d'échéances.
 *
 * Un graphe de percentiles demande de savoir lire une bande de confiance ; un
 * tableau répond directement à la question posée : « dans 12 mois, combien, et
 * dans quelle fourchette ». Trois échéances suffisent — 6, 12 et 24 mois — là
 * où 25 points mensuels noyaient la lecture.
 *
 * Le scénario médian est mis en avant, les deux bornes l'encadrent. Le mot
 * « projection » est répété en pied : ce ne sont pas des prévisions, et l'écart
 * entre les colonnes est la seule chose honnête à en retenir.
 *
 * DEUX lectures, parce qu'elles ne disent pas la même chose. En dollars, seule
 * la stratégie est incertaine : le capital compose à un taux inconnu. En
 * bitcoin, le cours s'ajoute — et sa volatilité domine tout le reste, d'où une
 * fourchette bien plus large. Convertir simplement les montants dollars au spot
 * du jour aurait affiché une fourchette étroite là où la réalité est large.
 */

const usd = (v: number) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`

/** Échéances retenues, en mois. Bornées à l'horizon réellement publié. */
const HORIZONS = [6, 12, 24] as const

export function ProjectionTable({ projection }: Readonly<{ projection: VaultProjection }>) {
  const { points, startValueUsdc, startValueBtc, runs, btcVolAnnualPct } = projection

  // La lecture bitcoin n'est proposée que si la source la publie.
  const hasBtc = points.some((p) => p.btcP50 !== null)
  /* Le bitcoin d'abord : c'est l'unité du produit, et la lecture qui porte la
     vraie incertitude. La lecture en dollars reste à un clic. */
  const [unit, setUnit] = useState<'usd' | 'btc'>('btc')
  const showBtc = hasBtc && unit === 'btc'

  const rows = HORIZONS.filter((m) => m < points.length).map((m) => ({
    months: m,
    point: points[m],
  }))

  if (rows.length === 0) {
    return (
      <p className="projection-absent">
        The published horizon is too short to project — nothing is shown rather than a guess.
      </p>
    )
  }

  const base = showBtc ? startValueBtc : startValueUsdc
  const fmt = (v: number | null) =>
    v === null ? '—' : showBtc ? `${formatNumber(v, { maximumFractionDigits: 2 })} BTC` : usd(v)
  const growth = (v: number | null) =>
    v === null || base === null || base <= 0 ? null : ((v - base) / base) * 100

  const cell = (v: number | null) => (
    <>
      <span className="projection-amount">{fmt(v)}</span>
      {growth(v) !== null ? (
        <span className="projection-delta">
          {formatPercent(growth(v) as number, { maximumFractionDigits: 1, signed: true })}
        </span>
      ) : null}
    </>
  )

  return (
    <div className="projection">
      <div className="projection-head">
        <div>
          <p className="projection-lead-label">Vault value today</p>
          <p className="projection-lead-value">{fmt(base)}</p>
        </div>

        {hasBtc ? (
          <div className="projection-units" role="group" aria-label="Projection unit">
            <button
              type="button"
              className={`projection-unit${unit === 'btc' ? ' active' : ''}`}
              aria-pressed={unit === 'btc'}
              onClick={() => setUnit('btc')}
            >
              BTC
            </button>
            <button
              type="button"
              className={`projection-unit${unit === 'usd' ? ' active' : ''}`}
              aria-pressed={unit === 'usd'}
              onClick={() => setUnit('usd')}
            >
              USDC
            </button>
          </div>
        ) : null}
      </div>

      <table className="projection-table">
        <thead>
          <tr>
            <th scope="col">Horizon</th>
            <th scope="col">Downside</th>
            <th scope="col" className="is-median">
              Median
            </th>
            <th scope="col">Upside</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ months, point }) => (
            <tr key={months}>
              <th scope="row">{months} months</th>
              <td>{cell(showBtc ? point.btcP10 : point.p10)}</td>
              <td className="is-median">{cell(showBtc ? point.btcP50 : point.p50)}</td>
              <td>{cell(showBtc ? point.btcP90 : point.p90)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="projection-note">
        Monte-Carlo simulation over {formatNumber(runs)} runs. Downside and upside are the 10th and
        90th percentiles: eight runs out of ten land between them.{' '}
        {showBtc ? (
          <>
            In bitcoin the spread is far wider, because the price moves too
            {btcVolAnnualPct !== null
              ? ` (${formatNumber(btcVolAnnualPct, { maximumFractionDigits: 0 })} % annualised volatility)`
              : ''}
            : a vault paying a dollar yield does not protect against a rising bitcoin.
          </>
        ) : (
          'In dollars only the strategy is uncertain — the bitcoin price is not modelled here.'
        )}{' '}
        A projection is not a forecast.
      </p>
    </div>
  )
}
