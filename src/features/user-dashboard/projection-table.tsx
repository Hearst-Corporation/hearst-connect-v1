'use client'

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
 */

const usd = (v: number) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`

/** Échéances retenues, en mois. Bornées à l'horizon réellement publié. */
const HORIZONS = [6, 12, 24] as const

export function ProjectionTable({ projection }: Readonly<{ projection: VaultProjection }>) {
  const { points, startValueUsdc, runs } = projection

  // `points[i]` est le mois i : l'index EST l'échéance, la série partant de 0.
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

  const growth = (v: number) => (startValueUsdc > 0 ? ((v - startValueUsdc) / startValueUsdc) * 100 : 0)

  return (
    <div className="projection">
      <div className="projection-lead">
        <p className="projection-lead-label">Vault value today</p>
        <p className="projection-lead-value">{usd(startValueUsdc)}</p>
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
              <td>
                <span className="projection-amount">{usd(point.p10)}</span>
                <span className="projection-delta">
                  {formatPercent(growth(point.p10), { maximumFractionDigits: 1, signed: true })}
                </span>
              </td>
              <td className="is-median">
                <span className="projection-amount">{usd(point.p50)}</span>
                <span className="projection-delta">
                  {formatPercent(growth(point.p50), { maximumFractionDigits: 1, signed: true })}
                </span>
              </td>
              <td>
                <span className="projection-amount">{usd(point.p90)}</span>
                <span className="projection-delta">
                  {formatPercent(growth(point.p90), { maximumFractionDigits: 1, signed: true })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="projection-note">
        Monte-Carlo simulation over {formatNumber(runs)} runs. Downside and upside are the 10th and
        90th percentiles: eight runs out of ten land between them. A projection is not a forecast —
        past strategy behaviour does not bind future returns.
      </p>
    </div>
  )
}
