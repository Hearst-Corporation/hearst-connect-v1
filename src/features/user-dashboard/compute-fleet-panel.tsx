'use client'

import { BoltIcon } from '@heroicons/react/24/outline'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { formatBtc, formatNumber } from '@/lib/format'
import { useEffect, useRef, useState } from 'react'
import type { ComputeFleet } from './load'

/**
 * Compute Infrastructure — la puissance de minage, vue du client.
 *
 * HIÉRARCHIE : ce qui revient AU CLIENT d'abord, le parc entier ensuite. La
 * capacité industrielle impressionne, mais elle ne répond pas à la question du
 * porteur de vault : « combien de cette puissance travaille pour MOI ». Le parc
 * devient donc le contexte de la part, et non l'inverse.
 *
 * La part est PUBLIÉE par la source, jamais calculée ici — voir le contrat
 * `ComputeFleet`. Diviser le capital du vault par un encours global donnerait
 * un chiffre faux et flatteur ; tant que la source ne publie rien, la bande
 * client affiche une absence nommée.
 *
 * Chaque métrique reste indépendante : une valeur illisible met un `—` à sa
 * place et laisse les autres, plutôt que de vider le panneau.
 */

/** Trame du parc : 3 rangées, autant de colonnes que la cellule en contient.
    Neuf colonnes fixes laissaient un vide à droite sur un bloc large ; la
    trame va désormais d'un bord à l'autre. */
const DOT_ROWS = 3
const DOT_SIZE = 34
const DOT_GAP = 8

function FleetDots({ on }: Readonly<{ on: boolean }>) {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(9)
  useEffect(() => {
    const el = ref.current
    if (el === null) return
    const fit = () => {
      const gap = Number.parseFloat(getComputedStyle(el).columnGap) || DOT_GAP
      setCols(Math.max(1, Math.floor((el.clientWidth + gap) / (DOT_SIZE + gap))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="fleet-dots" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols * DOT_ROWS }, (_, i) => (
        <span key={i} className={on ? 'is-on' : undefined} />
      ))}
    </div>
  )
}

/** Les libellés de la bande de droite. Le client lit « your vault » ; la console
 *  réutilise le MÊME panneau pour un vault donné ou pour l'ensemble des vaults. */
export type ComputeFleetCopy = Readonly<{
  eyebrow: string
  hashrate: string
  produced: string
  note: string
}>

const CLIENT_COPY: ComputeFleetCopy = {
  eyebrow: 'Allocated to your vault',
  hashrate: 'Your hashrate',
  produced: 'Produced for you',
  note: 'Allocated pro rata to your capital in the vault, and updated as the fleet grows.',
}

export function ComputeFleetPanel({
  fleet,
  /** Hashrate du réseau bitcoin — donne l'échelle de la capacité du parc. */
  networkHashrateEhs = null,
  copy = CLIENT_COPY,
}: Readonly<{ fleet: ComputeFleet; networkHashrateEhs?: number | null; copy?: ComputeFleetCopy }>) {
  /* `minersManaged` et `countries` ne sont plus lus : le compte de machines
     disait la même capacité que les EH/s, et l'implantation géographique a
     quitté le panneau. Les champs restent au contrat — la source les publie,
     d'autres surfaces peuvent les vouloir. */
  const {
    hashrateEhs,
    btcProducedTotal,
    uptimePct,
    allocatedHashrateThs,
    allocatedMiners,
    allocatedBtcProduced,
    allocatedSharePct,
  } = fleet

  /* Part du hashrate mondial. Bornée à 100 % : une lecture réseau en retard sur
     celle du parc ferait déborder la jauge, ce qui se verrait comme un bug
     plutôt que comme la donnée douteuse qu'elle serait. */
  const networkShare =
    hashrateEhs !== null && networkHashrateEhs !== null && networkHashrateEhs > 0
      ? Math.min((hashrateEhs / networkHashrateEhs) * 100, 100)
      : null

  /* La bande client n'a de sens que si AU MOINS une de ses mesures est lisible.
     Sinon elle annonce une absence, plutôt que trois tirets alignés. */
  const hasAllocation =
    allocatedHashrateThs !== null ||
    allocatedMiners !== null ||
    allocatedBtcProduced !== null ||
    allocatedSharePct !== null

  return (
    <div className="fleet-panel">
      {/* ══ CE QUI REVIENT AU CLIENT ═══════════════════════════════════════
          À DROITE, face à la trame du parc : c'est la lecture que le porteur de
          vault cherche, et elle doit être à hauteur d'œil. Le parc, autour,
          n'est que l'échelle qui lui donne son sens.

          La grille place les deux blocs (voir `.fleet-mine` dans la feuille) :
          l'ordre du balisage suit la lecture — la part d'abord, le parc
          ensuite — et le CSS les met côte à côte. */}
      <section className="fleet-mine" aria-label="Your allocated capacity">
        <div className="fleet-mine-head">
          <p className="fleet-mine-eyebrow">{copy.eyebrow}</p>
          {allocatedSharePct !== null ? (
            <p className="fleet-mine-share">
              {formatNumber(allocatedSharePct, { maximumFractionDigits: allocatedSharePct >= 1 ? 1 : 3 })} % of the
              fleet
            </p>
          ) : null}
        </div>

        {hasAllocation ? (
          <div className="fleet-mine-grid">
            {/* Le hashrate porte le bloc : c'est la puissance qui tourne pour ce
                vault, et la mesure dont tout le reste découle. */}
            <div className="fleet-mine-metric fleet-mine-metric--lead">
              <p className="fleet-mine-value">
                {/* En PH/s au-delà de 10 000 TH/s : « 209,802 TH/s » ne se lit pas. */}
                {allocatedHashrateThs === null
                  ? '—'
                  : allocatedHashrateThs >= 10_000
                    ? formatNumber(allocatedHashrateThs / 1000, { maximumFractionDigits: 1 })
                    : formatNumber(allocatedHashrateThs, { maximumFractionDigits: 0 })}
                {allocatedHashrateThs !== null ? (
                  <span className="fleet-mine-unit">{allocatedHashrateThs >= 10_000 ? 'PH/s' : 'TH/s'}</span>
                ) : null}
              </p>
              <p className="fleet-mine-label">{copy.hashrate}</p>

              {/* La part du parc, DESSINÉE et non plus seulement écrite en
                  pastille : une fraction de pour cent ne se saisit pas d'un
                  chiffre. La piste montre le parc entier, le trait ce qui
                  revient au vault.

                  Le remplissage a un PLANCHER visible : à 0.16 %, une largeur
                  fidèle ferait un trait d'un pixel qu'on lirait comme une barre
                  vide. La proportion exacte reste dite par le texte, la barre
                  en donne la nature — une petite part d'un grand ensemble. */}
              {allocatedSharePct !== null ? (
                <div className="fleet-mine-bar" aria-hidden="true">
                  <span
                    className="fleet-mine-bar-fill"
                    style={{ width: `${Math.max(Math.min(allocatedSharePct, 100), 2.5)}%` }}
                  />
                </div>
              ) : null}
            </div>

            {/* La production revient au client : elle se détache sur son propre
                fond, comme un acquis et non comme une caractéristique du parc. */}
            <div className="fleet-mine-metric fleet-mine-metric--produced">
              <p className="fleet-mine-value">
                {formatBtc(allocatedBtcProduced, { withUnit: false })}
                {allocatedBtcProduced !== null ? <span className="fleet-mine-unit">BTC</span> : null}
              </p>
              <p className="fleet-mine-label">{copy.produced}</p>
            </div>
          </div>
        ) : (
          /* Absence NOMMÉE : la source ne publie pas encore la répartition. Rien
             n'est déduit du capital — une règle de trois donnerait un chiffre
             crédible et faux. */
          <p className="fleet-mine-absent">
            Your allocated share is not published yet — it is reported by the fleet, never
            estimated from your capital.
          </p>
        )}

        {/* Prorata : la règle, dite en clair. Sans elle, « 2 machines » sonne
            comme une dotation arbitraire. */}
        <p className="fleet-mine-note">{copy.note}</p>
      </section>

      {/* ── La capacité du parc ───────────────────────────────────────────
          UNE seule cellule pour la puissance : le compte de machines et les
          EH/s disaient la même capacité dans deux unités, sur deux blocs
          voisins. Les EH/s l'emportent — c'est l'unité du métier, et celle
          qui se compare au réseau mondial.

          La trame de carrés reste : elle n'est pas un décor, elle évoque la
          ferme dont la part du client est extraite. Décorative pour le lecteur
          d'écran — le chiffre au-dessus porte déjà l'information. */}
      <div className="fleet-cell fleet-cell--miners">
        <p className="fleet-cell-label">
          <BoltIcon className="size-4" aria-hidden="true" />
          Operational capacity
        </p>
        <p className="fleet-cell-value">
          {hashrateEhs === null ? '—' : formatNumber(hashrateEhs, { maximumFractionDigits: 1 })}
          {hashrateEhs !== null ? <span className="fleet-cell-unit">EH/s</span> : null}
        </p>
        <p className="fleet-cell-note">
          {networkShare !== null
            ? `${formatNumber(networkShare, { maximumFractionDigits: 2 })} % of the ${formatNumber(networkHashrateEhs ?? 0, { maximumFractionDigits: 0 })} EH/s bitcoin network`
            : 'Share of network unavailable'}
        </p>
        <FleetDots on={hashrateEhs !== null} />
      </div>

      {/* ── La production ─────────────────────────────────────────────────
          Le cumul depuis l'origine, à l'échelle du parc. */}
      <div className="fleet-cell fleet-cell--produced">
        <p className="fleet-cell-label">
          <BitcoinIcon className="size-4" aria-hidden="true" />
          Produced to date
        </p>
        <p className="fleet-cell-value">
          {formatBtc(btcProducedTotal, { withUnit: false })}
          {btcProducedTotal !== null ? <span className="fleet-cell-unit">BTC</span> : null}
        </p>
        <p className="fleet-cell-note">Mined by the fleet since inception</p>
      </div>

      {/* ── La disponibilité ──────────────────────────────────────────────
          Une machine à l'arrêt ne produit rien : le taux de disponibilité est
          directement un taux de production. */}
      <div className="fleet-cell">
        <p className="fleet-cell-label">
          <span className="fleet-cell-dot" aria-hidden="true" />
          Uptime
        </p>
        <p className="fleet-cell-value">
          {uptimePct === null ? '—' : formatNumber(uptimePct, { maximumFractionDigits: 1 })}
          {uptimePct !== null ? <span className="fleet-cell-unit">%</span> : null}
        </p>
        {uptimePct !== null ? (
          <div className="fleet-gauge">
            <div className="fleet-gauge-fill" style={{ width: `${Math.min(uptimePct, 100)}%` }} />
          </div>
        ) : null}
        <p className="fleet-cell-note">Operated 24/7 by dedicated infrastructure teams</p>
      </div>
    </div>
  )
}
