'use client'

import { BanknotesIcon } from '@heroicons/react/24/outline'
import { categoricalColor } from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'
import { formatBtc, formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { Pie, PieChart } from 'recharts'
import type { Distribution } from './load'

/**
 * Distributions par état — versé, approuvé, en attente.
 *
 * Le centre porte le total RÉELLEMENT versé, en bitcoin — l'unité du produit.
 * Les deux autres états n'y entrent pas : additionner un versement reçu et une
 * intention donnerait un total que personne n'a touché.
 */

const DONUT_PX = 200

const STATUS_ORDER = ['Paid', 'Approved', 'Pending'] as const

export function DistributionsDonut({
  distributions,
}: Readonly<{ distributions: Availability<readonly Distribution[]> }>) {
  const { ref, width } = useChartWidth()
  const rows = valueOf(distributions)

  const heading = (
    <div className="flank-heading">
      <h2>
        <BanknotesIcon className="size-4" aria-hidden="true" />
        Distributions
      </h2>
      <span>Paid out, approved and pending</span>
    </div>
  )

  if (rows === null) {
    return (
      <section className="flank-panel" aria-label="Distributions">
        {heading}
        <p className="distributions-absent">
          {isAvailable(distributions)
            ? 'No distribution has been recorded yet.'
            : 'Distributions are not available — nothing is shown rather than a guess.'}
        </p>
      </section>
    )
  }

  /*
   * Regroupement par état, dans un ordre FIXE : les couleurs ne permutent pas
   * quand un mois change de statut.
   *
   * Les parts sont comptées en BITCOIN, l'unité du produit. Chaque mois a été
   * converti au cours de SA distribution — c'est pourquoi on somme les montants
   * BTC ligne par ligne plutôt que de diviser un total en dollars par le spot
   * du jour, ce qui réécrirait l'histoire au cours d'aujourd'hui.
   */
  const buckets = new Map<string, number>()
  let paidBtc = 0
  for (const d of rows) {
    const label =
      d.status === 'distributed' ? 'Paid' : d.status === 'approved' ? 'Approved' : 'Pending'
    buckets.set(label, (buckets.get(label) ?? 0) + (d.btcAmount ?? 0))
    if (d.status === 'distributed') paidBtc += d.btcAmount ?? 0
  }

  const slices = STATUS_ORDER.filter((s) => buckets.has(s)).map((label, index) => ({
    label,
    value: buckets.get(label) ?? 0,
    fill: categoricalColor(index),
  }))

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  return (
    <section className="flank-panel" aria-label="Distributions">
      {heading}

      <div className="dist-donut">
        <div
          ref={ref}
          aria-hidden="true"
          className="dist-donut-plot"
          style={{ height: DONUT_PX }}
        >
          {width > 0 ? (
            <PieChart width={width} height={DONUT_PX}>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="64%"
                outerRadius="88%"
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
              />
            </PieChart>
          ) : null}

          {/* Le centre ne porte QUE le versé : c'est de l'argent reçu, pas la
              somme des trois états. */}
          <div className="dist-donut-center">
            <p className="dist-donut-btc">
              {formatBtc(paidBtc)}
            </p>
            <p className="dist-donut-caption">distributed</p>
          </div>
        </div>

        <ul className="dist-legend">
          {slices.map((s) => (
            <li key={s.label} className="dist-legend-row">
              <span className="dist-legend-key" style={{ background: s.fill }} aria-hidden="true" />
              <span className="dist-legend-label">{s.label}</span>
              <span className="dist-legend-value">
                {formatBtc(s.value)}
              </span>
              <span className="dist-legend-share">
                {total > 0 ? `${formatNumber((s.value / total) * 100, { maximumFractionDigits: 0 })} %` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
