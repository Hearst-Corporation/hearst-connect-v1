'use client'

import { BoltIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import { formatNumber, formatPercent } from '@/lib/format'
import { MetricRow, difficultyLabel, hashpriceLabel } from './metric-row'
import type { ProductionCost } from './load'

/**
 * Coût de production d'un bitcoin, contre son prix de marché.
 *
 * Le sujet n'est ni l'un ni l'autre chiffre : c'est L'ÉCART. Tant que produire
 * coûte moins que vendre, chaque bitcoin miné crée de la valeur ; l'inverse la
 * détruit. Une barre unique où le coût occupe sa part du prix rend ce rapport
 * lisible sans qu'on ait à soustraire deux nombres de tête.
 *
 * Les paramètres réseau sous la barre disent D'OÙ vient le coût — difficulté,
 * hashrate, prix de l'électricité. Sans eux, le chiffre serait un oracle.
 */

const usd = (v: number) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`

export function ProductionCostPanel({
  cost,
  hashprice = null,
}: Readonly<{
  cost: ProductionCost
  /** Revenu par unité de puissance — le pendant marché du coût. */
  hashprice?: number | null
}>) {
  const { costPerBtcUsd, marketPriceUsd, marginPct } = cost
  // La part du prix que le coût consomme — bornée à 100 % pour que la barre
  // reste lisible quand produire coûte plus cher que vendre.
  const costShare = marketPriceUsd > 0 ? Math.min((costPerBtcUsd / marketPriceUsd) * 100, 100) : 0
  const profitable = marginPct >= 0

  // Marge de sécurité : de combien le marché peut reculer avant que produire
  // coûte plus que vendre. C'est LA question d'un produit adossé au minage —
  // pas « combien coûte un BTC », mais « combien de baisse on encaisse ».
  const cushionPct = marketPriceUsd > 0 ? ((marketPriceUsd - costPerBtcUsd) / marketPriceUsd) * 100 : 0

  return (
    <div className="prodcost">
      <div className="prodcost-lead">
        <p className="prodcost-lead-value">
          {formatNumber(Math.abs(cushionPct), { maximumFractionDigits: 0 })} %
        </p>
        <p className="prodcost-lead-note">
          {profitable ? (
            <>
              <span className="prodcost-lead-strong">
                Bitcoin can fall {formatNumber(cushionPct, { maximumFractionDigits: 0 })} %
              </span>{' '}
              before mining stops being profitable.
            </>
          ) : (
            <>
              <span className="prodcost-lead-strong">
                Bitcoin must rise {formatNumber(Math.abs(cushionPct), { maximumFractionDigits: 0 })} %
              </span>{' '}
              before mining becomes profitable again.
            </>
          )}
        </p>
      </div>

      {/* Les deux bornes encadrent la piste : le coût à gauche, le prix de vente
          à droite — l'ordre de lecture d'une échelle horizontale. */}
      <div className="prodcost-ends">
        <div className="prodcost-end">
          <p className="prodcost-end-label">Cost to mine one BTC</p>
          <p className="prodcost-end-value">{usd(costPerBtcUsd)}</p>
        </div>
        <div className="prodcost-end prodcost-end--right">
          <p className="prodcost-end-label">Market price today</p>
          <p className="prodcost-end-value">{usd(marketPriceUsd)}</p>
        </div>
      </div>

      {/* Une seule piste : le coût occupe sa part, la marge est le reste. La
          largeur de l'aplat vert EST la marge de sécurité. */}
      <div className={`prodcost-bar ${profitable ? 'is-profitable' : 'is-underwater'}`}>
        <div className="prodcost-bar-cost" style={{ width: `${costShare}%` }} />
      </div>

      <p className="prodcost-legend">
        <span className="prodcost-key prodcost-key--cost" aria-hidden="true" />
        Production cost
        <span className="prodcost-key prodcost-key--margin" aria-hidden="true" />
        Margin&nbsp;
        <strong>
          {profitable ? '+' : '−'}${formatNumber(Math.abs(marketPriceUsd - costPerBtcUsd), { maximumFractionDigits: 0 })}
        </strong>
        <span className="prodcost-legend-pct">
          {formatPercent(marginPct, { maximumFractionDigits: 1, signed: true })}
        </span>
      </p>

      {/* Les paramètres qui DÉTERMINENT le coût, au même registre que le flanc
          « BTC context » — même composant, donc les deux blocs ne peuvent pas
          diverger. Sans eux, le chiffre du haut serait un oracle. */}
      <div className="prodcost-rows">
        <MetricRow
          icon={CpuChipIcon}
          label="Network difficulty"
          value={difficultyLabel(cost.networkDifficulty)}
        />
        <MetricRow
          icon={BoltIcon}
          label="Network hashrate"
          value={
            cost.hashrateEhs !== null
              ? `${formatNumber(cost.hashrateEhs, { maximumFractionDigits: 1 })} EH/s`
              : '—'
          }
        />
        <MetricRow
          icon={BoltIcon}
          label="Electricity"
          value={
            cost.electricityUsdPerKwh !== null
              ? `$${formatNumber(cost.electricityUsdPerKwh, { maximumFractionDigits: 3 })} / kWh`
              : '—'
          }
        />
        <MetricRow icon={BoltIcon} label="Hashprice" value={hashpriceLabel(hashprice)} />
      </div>
    </div>
  )
}
