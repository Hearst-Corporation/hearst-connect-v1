'use client'

import { CpuChipIcon, BoltIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { formatNumber } from '@/lib/format'
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

/** Points de la trame du parc : 4 rangées de 9. Six rangées étiraient la
    cellule bien au-delà de ce que son chiffre demande — la trame évoque la
    ferme, elle n'a pas à occuper la hauteur d'un graphe. */
const GRID_DOTS = 36

const intText = (v: number | null) =>
  v === null ? '—' : formatNumber(v, { maximumFractionDigits: 0 })

export function ComputeFleetPanel({
  fleet,
  /** Hashrate du réseau bitcoin — donne l'échelle de la capacité du parc. */
  networkHashrateEhs = null,
}: Readonly<{ fleet: ComputeFleet; networkHashrateEhs?: number | null }>) {
  const {
    minersManaged,
    hashrateEhs,
    btcProducedTotal,
    countries,
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
          <p className="fleet-mine-eyebrow">Allocated to your vault</p>
          {allocatedSharePct !== null ? (
            <p className="fleet-mine-share">
              {formatNumber(allocatedSharePct, { maximumFractionDigits: 3 })} % of the fleet
            </p>
          ) : null}
        </div>

        {hasAllocation ? (
          <div className="fleet-mine-grid">
            <div className="fleet-mine-metric">
              <p className="fleet-mine-value">
                {allocatedHashrateThs === null
                  ? '—'
                  : formatNumber(allocatedHashrateThs, { maximumFractionDigits: 0 })}
                {allocatedHashrateThs !== null ? (
                  <span className="fleet-mine-unit">TH/s</span>
                ) : null}
              </p>
              <p className="fleet-mine-label">Your hashrate</p>
            </div>

            <div className="fleet-mine-metric">
              <p className="fleet-mine-value">
                {intText(allocatedMiners)}
                {allocatedMiners !== null ? (
                  <span className="fleet-mine-unit">
                    {allocatedMiners > 1 ? 'miners' : 'miner'}
                  </span>
                ) : null}
              </p>
              <p className="fleet-mine-label">Machines working for you</p>
            </div>

            <div className="fleet-mine-metric">
              <p className="fleet-mine-value">
                {allocatedBtcProduced === null
                  ? '—'
                  : formatNumber(allocatedBtcProduced, { maximumFractionDigits: 4 })}
                {allocatedBtcProduced !== null ? <span className="fleet-mine-unit">BTC</span> : null}
              </p>
              <p className="fleet-mine-label">Produced for you</p>
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
        <p className="fleet-mine-note">
          Allocated pro rata to your capital in the vault, and updated as the fleet grows.
        </p>
      </section>

      {/* ── Les machines ──────────────────────────────────────────────────
          La trame n'est pas un décor : elle évoque la ferme dont la part du
          client est extraite. Décorative pour le lecteur d'écran — le chiffre
          à côté porte déjà l'information. */}
      <div className="fleet-cell fleet-cell--miners">
        <p className="fleet-cell-label">
          <CpuChipIcon className="size-4" aria-hidden="true" />
          Miners managed
        </p>
        <p className="fleet-cell-value">{intText(minersManaged)}</p>
        <p className="fleet-cell-note">ASIC units under active management</p>
        <div className="fleet-dots" aria-hidden="true">
          {Array.from({ length: GRID_DOTS }, (_, i) => (
            <span key={i} className={minersManaged !== null ? 'is-on' : undefined} />
          ))}
        </div>
      </div>

      {/* ── La capacité ───────────────────────────────────────────────────
          Un hashrate isolé ne se lit pas : la jauge le rapporte au réseau
          mondial, seule échelle qui lui donne un sens. */}
      <div className="fleet-cell fleet-cell--hashrate">
        <p className="fleet-cell-label">
          <BoltIcon className="size-4" aria-hidden="true" />
          Operational capacity
        </p>
        <p className="fleet-cell-value">
          {hashrateEhs === null ? '—' : formatNumber(hashrateEhs, { maximumFractionDigits: 1 })}
          {hashrateEhs !== null ? <span className="fleet-cell-unit">EH/s</span> : null}
        </p>
        {networkShare !== null ? (
          <>
            <div className="fleet-gauge">
              <div className="fleet-gauge-fill" style={{ width: `${Math.max(networkShare, 0.6)}%` }} />
            </div>
            <p className="fleet-cell-note">
              {formatNumber(networkShare, { maximumFractionDigits: 2 })} % of the{' '}
              {formatNumber(networkHashrateEhs ?? 0, { maximumFractionDigits: 0 })} EH/s bitcoin network
            </p>
          </>
        ) : (
          <p className="fleet-cell-note">Share of network unavailable</p>
        )}
      </div>

      {/* ── La production ─────────────────────────────────────────────────
          Le cumul depuis l'origine, à l'échelle du parc. */}
      <div className="fleet-cell fleet-cell--produced">
        <p className="fleet-cell-label">
          <BitcoinIcon className="size-4" aria-hidden="true" />
          Produced to date
        </p>
        <p className="fleet-cell-value">
          {btcProducedTotal === null
            ? '—'
            : formatNumber(btcProducedTotal, { maximumFractionDigits: 1 })}
          {btcProducedTotal !== null ? <span className="fleet-cell-unit">BTC</span> : null}
        </p>
        <p className="fleet-cell-note">Mined by the fleet since inception</p>
      </div>

      {/* ── L'implantation ────────────────────────────────────────────────
          La dispersion géographique protège d'une panne réseau ou d'un coup de
          réglementation local. */}
      <div className="fleet-cell">
        <p className="fleet-cell-label">
          <GlobeAltIcon className="size-4" aria-hidden="true" />
          Countries
        </p>
        <p className="fleet-cell-value">
          {countries === null ? '—' : intText(countries)}
          {countries !== null ? <span className="fleet-cell-unit">+</span> : null}
        </p>
        <p className="fleet-cell-note">Sites spread across multiple jurisdictions</p>
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
