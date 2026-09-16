'use client'

import { BoltIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import { formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { MetricRow, difficultyLabel, hashpriceLabel } from './metric-row'
import type { ProductionCost } from './load'

/**
 * Mining economics — le flanc droit de la bande d'analyse.
 *
 * Ce bloc remplace « Compute Infrastructure » : la capacité du parc disait ce
 * qu'on POSSÈDE, l'économie du minage dit ce que ça RAPPORTE.
 *
 * HIÉRARCHIE : le COÛT DE PRODUCTION en tête. C'est le prix auquel le produit
 * obtient son bitcoin — la mesure qui distingue le minage d'un achat au marché,
 * et celle qu'un porteur de vault vient chercher ici.
 *
 * FORME : une barre, pas un anneau. Le sujet est un RAPPORT entre deux montants
 * — ce que produire coûte, ce que vendre rapporte — et une piste horizontale le
 * dit directement : sa longueur totale est le prix de marché, le coût l'occupe
 * par la gauche, et l'aplat restant EST la marge de sécurité. Le flanc gauche
 * portant déjà un donut, une seconde figure circulaire face à lui n'aurait
 * ajouté qu'une redite visuelle.
 */

const usd = (v: number) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`

export function MiningEconomicsFlank({
  cost,
  hashprice = null,
}: Readonly<{
  cost: Availability<ProductionCost>
  /** Revenu par unité de puissance — le pendant marché du coût. */
  hashprice?: number | null
}>) {
  const c = valueOf(cost)

  return (
    <section className="flank-panel mining-flank" aria-label="Mining economics">
      <div className="flank-heading">
        <h2>
          <CpuChipIcon className="size-4" aria-hidden="true" />
          Mining economics
        </h2>
        <span>How far bitcoin can fall before mining stops paying</span>
      </div>

      {c === null ? (
        <p className="mining-flank-absent">
          {isAvailable(cost)
            ? 'Production cost is not computable from the current network readings.'
            : 'Mining economics are not available — nothing is shown rather than a guess.'}
        </p>
      ) : (
        <MiningEconomicsBody cost={c} hashprice={hashprice} />
      )}
    </section>
  )
}

function MiningEconomicsBody({
  cost,
  hashprice,
}: Readonly<{ cost: ProductionCost; hashprice: number | null }>) {
  const { costPerBtcUsd, marketPriceUsd, marginPct } = cost
  const profitable = marginPct >= 0

  // Marge de sécurité : de combien le marché peut reculer avant que produire
  // coûte plus que vendre. C'est LA question d'un produit adossé au minage.
  const cushionPct = marketPriceUsd > 0 ? ((marketPriceUsd - costPerBtcUsd) / marketPriceUsd) * 100 : 0
  // Part de l'arc que remplit la marge, bornée à [0, 100] : sous l'eau, l'arc se
  // vide plutôt que de repartir en arrière, et un coût nul ne le fait pas
  // déborder au-delà du tour complet.
  const filled = Math.min(Math.max(Math.abs(cushionPct), 0), 100)
  /* Part de la piste occupée par le coût. Bornée à 100 % : sous l'eau, la piste
     est pleine plutôt que de déborder — un dépassement se verrait comme un bug
     d'affichage, alors que la couleur porte déjà l'alerte. */
  const costShare =
    marketPriceUsd > 0 ? Math.min((costPerBtcUsd / marketPriceUsd) * 100, 100) : 100

  return (
    <div className="mining-flank-body">
      {/* ── LE COÛT DE PRODUCTION ─────────────────────────────────────────
          Chiffre de tête : c'est à CE prix que le produit obtient son bitcoin,
          la mesure qui distingue le minage d'un simple achat au marché. */}
      <div className="mining-flank-lead">
        <p className="mining-flank-lead-label">Cost to mine one BTC</p>
        <p className="mining-flank-lead-value">{usd(costPerBtcUsd)}</p>
      </div>

      {/* ══ L'AXE DES PRIX ═════════════════════════════════════════════════
          Une réglette horizontale, lue de gauche à droite : le coût de
          production borne la gauche, le prix de marché la droite, et la
          distance entre les deux EST la marge de sécurité.

          Le repère blanc marque le SEUIL — le point où produire cesse de
          rapporter. Ce que la figure dit, c'est de combien le marché peut
          reculer avant de l'atteindre : la question du bloc, posée en distance
          plutôt qu'en pourcentage. */}
      <div className="mining-axis">
        <div
          className="mining-axis-track"
          role="img"
          aria-label={
            profitable
              ? `Production cost ${usd(costPerBtcUsd)} against a ${usd(marketPriceUsd)} market price — margin ${usd(marketPriceUsd - costPerBtcUsd)}, ${formatNumber(filled, { maximumFractionDigits: 0 })} percent above break-even.`
              : `Production cost ${usd(costPerBtcUsd)} exceeds the ${usd(marketPriceUsd)} market price.`
          }
        >
          {/* La zone de marge occupe ce qui sépare le seuil du prix courant.
              Sa LARGEUR est la marge de sécurité. */}
          <div
            className={`mining-axis-safe${profitable ? '' : ' is-underwater'}`}
            style={{ width: `${100 - costShare}%` }}
          />
          {/* Le repère du seuil, posé à l'abscisse du coût de production. */}
          <span className="mining-axis-pin" style={{ left: `${costShare}%` }} aria-hidden="true" />
        </div>

        {/* Sous la piste : à gauche la MARGE — c'est elle que dessine la zone
            verte, et la nommer là où elle commence vaut mieux que de répéter le
            seuil, déjà écrit en grand juste au-dessus. À droite le prix de
            marché, borne de l'axe. */}
        <div className="mining-axis-scale">
          <div className="mining-axis-end">
            <p className="mining-axis-end-label">Margin per BTC</p>
            <p className={`mining-axis-end-value${profitable ? ' is-gain' : ' is-loss'}`}>
              {profitable ? '+' : '−'}${formatNumber(Math.abs(marketPriceUsd - costPerBtcUsd), { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="mining-axis-end mining-axis-end--right">
            <p className="mining-axis-end-label">Market price today</p>
            <p className="mining-axis-end-value is-market">{usd(marketPriceUsd)}</p>
          </div>
        </div>
      </div>

      {/* La marge de sécurité, en une phrase plutôt qu'en anneau : le flanc
          gauche porte déjà un donut, et une seconde proportion dessinée face à
          lui ajoutait une figure sans ajouter de lecture. Le pourcentage est
          mis en avant dans le texte — il reste le fait, seule sa forme change. */}
      <p className={`mining-flank-cushion${profitable ? '' : ' is-underwater'}`}>
        {profitable ? (
          <>
            Bitcoin can fall{' '}
            <strong>{formatNumber(filled, { maximumFractionDigits: 0 })} %</strong> before mining
            stops being profitable.
          </>
        ) : (
          <>
            Bitcoin must rise{' '}
            <strong>{formatNumber(filled, { maximumFractionDigits: 0 })} %</strong> before mining
            becomes profitable again.
          </>
        )}
      </p>

      {/* Les quatre paramètres qui DÉTERMINENT le coût. Chacun porte son picto
          cerclé — `MetricRow`, le même composant que le flanc « BTC context » et
          le panneau admin : une seule définition, donc les blocs ne peuvent pas
          diverger d'un padding ou d'une taille d'icône.

          L'icône n'est pas décorative : elle distingue d'un coup d'œil ce qui
          relève du réseau (la puce, pour la difficulté) de ce qui relève de
          l'énergie et de son prix (l'éclair). */}
      <div className="mining-flank-params">
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

      <p className="mining-flank-foot">
        <BoltIcon className="size-3.5" aria-hidden="true" />
        Live network readings
      </p>
    </div>
  )
}
