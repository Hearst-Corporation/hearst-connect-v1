import { CheckCircleIcon } from '@heroicons/react/24/outline'
import type { PortalBuffer } from '@/features/client-portal/load'
import { formatBtc } from '@/lib/format'

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const monthShort = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })

/**
 * LE BUFFER D'ÉLECTRICITÉ — V2.
 *
 * 10 % du dépôt restent en USDC pour payer les factures du parc : le client n'a
 * jamais de facture à régler, et son bitcoin miné n'est pas vendu chaque mois.
 * Quand le buffer passe sous trois mois de factures, Hearst le recharge à six
 * mois en vendant une part du bitcoin miné ce mois-là — jamais plus de la moitié.
 *
 * La jauge dit combien de mois il couvre, avec le seuil de recharge et la cible ;
 * les barres disent, mois par mois, ce qui a été payé et ce qui a été rechargé.
 */
export function BufferPanel({ buffer }: Readonly<{ buffer: PortalBuffer }>) {
  const months = buffer.monthsCovered ?? 0
  const startMonths = buffer.monthlyElectricityUsd > 0 ? buffer.startUsd / buffer.monthlyElectricityUsd : buffer.targetMonths
  const scale = Math.max(buffer.targetMonths, startMonths, months) * 1.1
  const at = (m: number) => `${Math.min(100, Math.max(0, (m / scale) * 100))}%`
  const low = months < buffer.floorMonths
  const recent = buffer.history.slice(-12)
  const maxBill = Math.max(1, ...recent.map((h) => h.electricityUsd))

  return (
    <div className="buffer-panel">
      <div className="buffer-summary">
        <div>
          <span className="buffer-value">{usd(buffer.balanceUsd)}</span>
          <span className="buffer-caption">in USDC today · started at {usd(buffer.startUsd)}, 10 % of your deposit</span>
        </div>
        <span className={`buffer-tag${low ? ' is-low' : ''}`}>
          {buffer.monthsCovered === null ? '—' : `${months.toLocaleString('en-US', { maximumFractionDigits: 1 })} months of bills`}
        </span>
      </div>

      <div className="buffer-gauge" role="img" aria-label={`The buffer covers ${months.toFixed(1)} months of electricity`}>
        <span className="buffer-gauge-fill" style={{ width: at(months) }} />
        <span className="buffer-gauge-mark" style={{ left: at(buffer.floorMonths) }} data-label={`Refill below ${buffer.floorMonths} mo`} />
        <span className="buffer-gauge-mark is-target" style={{ left: at(buffer.targetMonths) }} data-label={`Refilled to ${buffer.targetMonths} mo`} />
      </div>

      <dl className="buffer-stats">
        <div>
          <dt>Electricity paid</dt>
          <dd>{usd(buffer.electricityPaidUsd)}</dd>
        </div>
        <div>
          <dt>A month of bills</dt>
          <dd>≈ {usd(buffer.monthlyElectricityUsd)}</dd>
        </div>
        <div>
          <dt>Mined for you</dt>
          <dd>{formatBtc(buffer.minedBtc)}</dd>
        </div>
        <div>
          <dt>Sold to refill</dt>
          <dd>{formatBtc(buffer.toppedUpBtc)}</dd>
        </div>
      </dl>

      {recent.length > 0 ? (
        <ol className="buffer-months" aria-label="Electricity paid and refills, month by month">
          {recent.map((h) => (
            <li key={h.month} title={`${monthShort(h.month)} — ${usd(h.electricityUsd)} paid${h.topUpBtc > 0 ? ` · refilled with ${formatBtc(h.topUpBtc)}` : ''}`}>
              <span className="buffer-bar" style={{ height: `${Math.max(6, (h.electricityUsd / maxBill) * 100)}%` }} />
              {h.topUpBtc > 0 ? <i className="buffer-refill" aria-hidden="true" /> : null}
              <em>{monthShort(h.month)}</em>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="rebalance-line">
        <CheckCircleIcon className="size-4" aria-hidden="true" />
        You never pay a bill. Below {buffer.floorMonths} months, Hearst refills the buffer to {buffer.targetMonths} with part of that month’s
        mined bitcoin — never more than half. Marked months had a refill.
      </p>
    </div>
  )
}
