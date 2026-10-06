'use client'

import { ActionOutcome, ConfirmField, actionButtonClass, actionFieldClass } from '@/components/admin/forms/admin-action-form'
import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import { formatNumber } from '@/lib/format'
import { useActionState, useState } from 'react'

/**
 * La déclaration du parc : sa puissance et le bitcoin cumulé qu'il a produit.
 *
 * Pré-remplie avec ce que lit le registre des machines — l'opérateur vérifie
 * et confirme, il ne recopie pas des chiffres à la main. Les sats sont
 * relus en bitcoin sous le champ.
 */
export function ReportMetricsButton({
  defaultThs,
  defaultSats,
}: Readonly<{ defaultThs: number | null; defaultSats: number | null }>) {
  const [outcome, action, pending] = useActionState<KeeperOutcome | null, FormData>(runKeeperAction, null)
  const [ths, setThs] = useState(defaultThs !== null ? String(Math.round(defaultThs)) : '')
  const [sats, setSats] = useState(defaultSats !== null ? String(Math.round(defaultSats)) : '')

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="endpointId" value="keeper-mining-report" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-fg-tertiary">Hashrate (TH/s)</span>
          <input
            name="hashrateTh"
            type="number"
            min={0}
            step={1}
            required
            value={ths}
            onChange={(e) => setThs(e.target.value)}
            className={actionFieldClass}
          />
          <span className="mt-1 block text-[11px] text-fg-tertiary">
            {ths !== '' ? `= ${formatNumber(Number(ths) / 1e6, { maximumFractionDigits: 2 })} EH/s` : ' '}
          </span>
        </label>
        <label className="block">
          <span className="text-xs text-fg-tertiary">BTC earned, cumulative (sats)</span>
          <input
            name="btcEarnedSats"
            type="number"
            min={0}
            step={1}
            required
            value={sats}
            onChange={(e) => setSats(e.target.value)}
            className={actionFieldClass}
          />
          <span className="mt-1 block text-[11px] text-fg-tertiary">
            {sats !== '' ? `= ${formatBtcValue(Number(sats) / 1e8)} BTC` : ' '}
          </span>
        </label>
      </div>
      <ConfirmField />
      <button type="submit" disabled={pending} className={`${actionButtonClass} w-full`}>
        {pending ? 'Sending…' : 'Report metrics'}
      </button>
      {outcome ? <ActionOutcome outcome={outcome} /> : null}
    </form>
  )
}
