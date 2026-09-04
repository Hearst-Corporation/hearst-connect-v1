'use client'

import type { BtcEquivalent, BtcVsHodl } from './load'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { formatNumber } from '@/lib/format'

/**
 * Position en bitcoin — le chiffre de tête d'un produit Bitcoin-first, mesuré
 * contre le seul repère qui compte pour un client BTC-natif : avoir gardé ses
 * bitcoins.
 *
 * Un bloc : le bandeau chiffré, puis la jauge de comparaison qui le prolonge.
 * La jauge superpose les deux valeurs sur une piste commune — barre pleine =
 * position, trait vertical = référence. L'œil lit l'écart sans comparer deux
 * nombres de tête.
 *
 * Le chiffre BTC est DÉRIVÉ du book USDC au spot, jamais un solde détenu : le
 * vault ne détient pas ce bitcoin. La ligne de pied le dit à l'écran, pour que
 * personne ne le lise comme une réserve. Quand une vraie réserve BTC existera
 * côté backend, on change la source et le bloc tient tel quel.
 */

/** BTC porte 8 décimales ; 6 se lisent proprement sans mentir sur la précision. */
const btcText = (n: number) => n.toFixed(6)

const usdText = (n: number) => `$${formatNumber(n, { maximumFractionDigits: 0 })}`

const pctText = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)} %`

export function BtcPositionHeadline({
  positionBtc,
  positionUsdc,
  accruedBtc,
  vsHodl,
}: Readonly<{
  positionBtc: Availability<BtcEquivalent>
  positionUsdc: number | null
  accruedBtc: Availability<BtcEquivalent>
  vsHodl: Availability<BtcVsHodl>
}>) {
  const pos = valueOf(positionBtc)
  const accrued = valueOf(accruedBtc)

  return (
    <section className="btc-block" aria-label="Your position in bitcoin">
      <div className="btc-block-top">
        {/* Pas de libellé : le titre de section « Bitcoin position » le porte
            déjà, et le doublon poussait la métrique vers le bas. */}
        <div className="btc-block-main">
          {pos !== null ? (
            <>
              <p className="btc-block-value">
                {btcText(pos.btc)}
                <span className="btc-block-unit">BTC</span>
              </p>
              <p className="btc-block-sub">
                <span>{positionUsdc !== null ? usdText(positionUsdc) : '—'}</span>
                <span className="btc-block-note">
                  converted at {usdText(pos.rateUsd)} / BTC — not a held balance
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="btc-block-value is-absent">
                —<span className="btc-block-unit">BTC</span>
              </p>
              <p className="btc-block-sub">
                <span className="btc-block-note">
                  {isAvailable(positionBtc)
                    ? 'Awaiting a verified source.'
                    : 'No BTC rate available — nothing is shown rather than a guess.'}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="btc-block-side">
          <p className="btc-block-label">Earned, in bitcoin</p>
          <p className="btc-block-side-value">
            {accrued !== null ? `${btcText(accrued.btc)} BTC` : '—'}
          </p>
          <p className="btc-block-note">What the reserve would hold today</p>
        </div>
      </div>

      <HodlGauge vsHodl={vsHodl} />
    </section>
  )
}

/**
 * Jauge : la position sur une piste, la référence HODL marquée d'un trait.
 *
 * L'échelle court jusqu'à la plus grande des deux valeurs, donc l'un des deux
 * repères touche toujours le bout — ce qui rend l'écart lisible comme une
 * distance, pas comme deux longueurs à mesurer.
 */
function HodlGauge({ vsHodl }: Readonly<{ vsHodl: Availability<BtcVsHodl> }>) {
  const hodl = valueOf(vsHodl)

  if (hodl === null) {
    return (
      <p className="btc-block-absent">
        {isAvailable(vsHodl)
          ? 'No book position to compare against holding bitcoin.'
          : 'Not enough BTC price history to compare against holding — nothing is shown rather than a guess.'}
      </p>
    )
  }

  const { heldBtc, hodlBtc, deltaPct, windowLabel } = hodl
  const ahead = deltaPct >= 0
  const peak = Math.max(heldBtc, hodlBtc)
  const heldPct = peak > 0 ? (heldBtc / peak) * 100 : 0
  const hodlPct = peak > 0 ? (hodlBtc / peak) * 100 : 0

  return (
    <div className={`btc-gauge ${ahead ? 'is-ahead' : 'is-behind'}`}>
      <div className="btc-gauge-head">
        <p className="btc-gauge-question">
          Against simply holding bitcoin
          <span className="btc-gauge-window">{windowLabel}</span>
        </p>
        <p className="btc-gauge-delta">
          <span className="btc-gauge-delta-value">{pctText(deltaPct)}</span>
        </p>
      </div>

      {/* Deux barres sur la MÊME échelle : la plus grande fait toute la largeur,
          l'autre est proportionnelle. Pas d'échelle tronquée qui exagérerait un
          écart de quelques pour cent — le pourcentage porte la précision, les
          barres portent le rapport. */}
      <div className="btc-gauge-rows">
        <div className="btc-gauge-row">
          <p className="btc-gauge-key">You</p>
          <div className="btc-gauge-track">
            <div className="btc-gauge-fill is-held" style={{ width: `${heldPct}%` }} />
          </div>
          <p className="btc-gauge-val">{btcText(heldBtc)}</p>
        </div>

        <div className="btc-gauge-row">
          <p className="btc-gauge-key">If you had held</p>
          <div className="btc-gauge-track">
            <div className="btc-gauge-fill is-hodl" style={{ width: `${hodlPct}%` }} />
          </div>
          <p className="btc-gauge-val">{btcText(hodlBtc)}</p>
        </div>
      </div>
    </div>
  )
}
