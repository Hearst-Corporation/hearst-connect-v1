'use client'

import { CpuChipIcon } from '@heroicons/react/24/outline'
import { formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { ComputeFleet } from './load'

/**
 * Compute Infrastructure — le parc auquel le vault donne accès.
 *
 * Ces quatre mesures portent sur TOUTE l'infrastructure, pas sur la part d'un
 * client : c'est la capacité industrielle derrière le produit. Le sous-titre le
 * dit, sans quoi « 750 BTC » se lirait comme un solde personnel.
 *
 * Chaque métrique s'affiche indépendamment : une valeur illisible met un `—` à
 * sa place et laisse les autres, plutôt que de vider le bloc.
 */

const intText = (v: number | null) => (v === null ? '—' : formatNumber(v, { maximumFractionDigits: 0 }))

export function ComputeFleetFlank({ fleet }: Readonly<{ fleet: Availability<ComputeFleet> }>) {
  const f = valueOf(fleet)

  return (
    <section className="flank-panel fleet-flank" aria-label="Compute infrastructure">
      <div className="flank-heading">
        <h2>
          <CpuChipIcon className="size-4" aria-hidden="true" />
          Compute Infrastructure
        </h2>
        <span>Fleet-wide capacity behind your vault — not your own share</span>
      </div>

      {f === null ? (
        <p className="fleet-absent">
          {isAvailable(fleet)
            ? 'No fleet is reporting capacity.'
            : 'Fleet metrics are not available — nothing is shown rather than a guess.'}
        </p>
      ) : (
        <>
          <dl className="fleet-metrics">
            <FleetMetric
              value={intText(f.minersManaged)}
              label="Miners managed"
            />
            <FleetMetric
              value={f.hashrateEhs === null ? '—' : `${formatNumber(f.hashrateEhs, { maximumFractionDigits: 1 })} EH/s`}
              label="Operational capacity"
            />
            <FleetMetric
              value={f.btcProducedTotal === null ? '—' : `${formatNumber(f.btcProducedTotal, { maximumFractionDigits: 0 })} BTC`}
              label="Produced"
            />
            <FleetMetric
              value={f.countries === null ? '—' : `${intText(f.countries)}+`}
              label="Countries"
            />
          </dl>

          {/* La disponibilité n'est pas une cinquième métrique de même rang :
              c'est une propriété du service, elle ferme le bloc. */}
          <p className="fleet-uptime">
            <span className="fleet-uptime-dot" aria-hidden="true" />
            {f.uptimePct !== null
              ? `Operated 24/7 · ${formatNumber(f.uptimePct, { maximumFractionDigits: 1 })} % uptime`
              : 'Operated 24/7 by dedicated infrastructure teams'}
          </p>
        </>
      )}
    </section>
  )
}

function FleetMetric({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div className="fleet-metric">
      <dt className="fleet-metric-value">{value}</dt>
      <dd className="fleet-metric-label">{label}</dd>
    </div>
  )
}
