'use client'

import type { ComponentType, SVGProps } from 'react'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { formatBtc } from '@/lib/format'
import type { BtcEquivalent, BtcVsHodl } from './load'
import { isAvailable, signalOf, valueOf, type Availability, type Signal } from '@/lib/vaults/model'
import { StatTile } from './stat-tile'

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

/* `formatBtc` partout : deux décimales, comme sur toutes les surfaces du
   tableau de bord. Six décimales donnaient des nombres qu'on lit chiffre à
   chiffre au lieu de les comparer. */
const pctText = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)} %`

/** Un fait du contrat : une constante qui situe la réserve sans la commenter. */
export type PositionTerm = {
  readonly label: string
  readonly value: string
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>
  readonly signal: Signal
  /** Ce que le chiffre veut dire, en une ligne sous lui. */
  readonly footnote?: string | null
}

export function BtcPositionHeadline({
  positionBtc,
  vsHodl,
  terms = [],
  note = null,
}: Readonly<{
  positionBtc: Availability<BtcEquivalent>
  vsHodl: Availability<BtcVsHodl>
  /** Capital versé, état, date d'entrée. Déjà formatés : le bandeau les
   *  affiche, il ne décide pas de leur écriture. */
  terms?: readonly PositionTerm[]
  /** D'où vient la réserve — sous le grand chiffre. */
  note?: string | null
}>) {
  const pos = valueOf(positionBtc)

  return (
    <section className="btc-block" aria-label="Your position in bitcoin">
      <div className="btc-block-top">
        {/* Pas de libellé : le titre de section « Bitcoin position » le porte
            déjà, et le doublon poussait la métrique vers le bas. */}
        {/* Le libellé passe AU-DESSUS du chiffre, comme dans les trois faits à
            droite : sous lui, les quatre valeurs ne tombaient pas sur la même
            ligne de base et la rangée paraissait décalée.

            Plus de contrevaleur en dollars : cette réserve agrège du rendement
            produit mois après mois à des cours différents, et la reconvertir au
            spot du jour afficherait une somme que le client n'a jamais reçue.
            Ce qui compte ici est la comparaison au simple achat, que
            `HodlGauge` porte juste en dessous. */}
        {/* La réserve prend la MÊME tuile que les trois faits et que les rangées
            du dessous : picto cerclé, pastille de fraîcheur, même graisse. Son
            vert la distingue — c'est la mesure du produit — sans qu'un balisage
            à part soit nécessaire.

            Plus de contrevaleur en dollars : cette réserve agrège du rendement
            produit mois après mois à des cours différents, et la reconvertir au
            spot du jour afficherait une somme que le client n'a jamais reçue.
            La comparaison qui compte est celle au simple achat, que `HodlGauge`
            porte juste en dessous. */}
        <StatTile
          icon={BitcoinIcon}
          /* « incl. your capital » : la réserve n'est pas que du bitcoin miné —
             elle agrège le capital souscrit et ce que la production y ajoute.
             Sans ce rappel, le libellé laissait croire que 5.27 BTC sortent du
             seul minage, alors que la tuile « Produced for your vault » en
             annonce 1.20. */
          label="Mined and accumulated, incl. your capital"
          value={formatBtc(pos?.btc ?? null)}
          signal={signalOf(positionBtc)}
          footnote={
            pos === null
              ? isAvailable(positionBtc)
                ? 'Awaiting a verified source.'
                : 'No BTC rate available — nothing is shown rather than a guess.'
              : note
          }
        />

        {/* ── Les faits du contrat ────────────────────────────────────────
            Capital versé, état, date d'entrée : trois constantes qui situent la
            réserve sans la commenter.

            Rendus par `StatTile`, le composant des rangées du dessous : picto
            cerclé, pastille de fraîcheur, même graisse. Un balisage maison les
            faisait ressembler à un bandeau à part, alors qu'elles sont du même
            rang que la production ou les retraits.

            Le rendement acquis qui vivait ici est parti : « Earned to date »,
            dans la section du vault, porte le même montant au milieu de la
            production et des retraits dont il se déduit. */}
        {terms.map((t) => (
          <StatTile
            key={t.label}
            icon={t.icon}
            label={t.label}
            value={t.value}
            signal={t.signal}
            footnote={t.footnote ?? null}
          />
        ))}
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
          <p className="btc-gauge-val">{formatBtc(heldBtc)}</p>
        </div>

        <div className="btc-gauge-row">
          <p className="btc-gauge-key">If you had held</p>
          <div className="btc-gauge-track">
            <div className="btc-gauge-fill is-hodl" style={{ width: `${hodlPct}%` }} />
          </div>
          <p className="btc-gauge-val">{formatBtc(hodlBtc)}</p>
        </div>
      </div>
    </div>
  )
}
