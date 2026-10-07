'use client'

import { requestWithdrawal, type WithdrawalOutcome } from '@/lib/backend/withdrawal-request'
import { useActionState, useState } from 'react'

/**
 * RETIRER — en bitcoin, vers le portefeuille du client.
 *
 * Le montant se saisit en BTC (c'est ce qui sort) ; le maximum est ce qui est
 * acquis et pas encore demandé. La demande part à Hearst, qui la valide : le
 * client le lit avant d'envoyer, pour qu'aucun « pending » ne le surprenne.
 */
export function WithdrawDialog({
  availableBtc,
  spotUsd,
  onClose,
}: Readonly<{ availableBtc: number; spotUsd: number | null; onClose: () => void }>) {
  const [outcome, action, pending] = useActionState<WithdrawalOutcome | null, FormData>(requestWithdrawal, null)
  /* Arrondi VERS LE BAS : « Max » ne doit jamais demander plus que le disponible. */
  const maxBtc = (Math.floor(availableBtc * 10_000) / 10_000).toFixed(4)
  const [amount, setAmount] = useState(() => (availableBtc > 0 ? maxBtc : ''))
  const btc = Number(amount.replace(',', '.'))
  const usd = spotUsd !== null && Number.isFinite(btc) && btc > 0 ? btc * spotUsd : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-label="Withdraw">
      <div className="w-full max-w-md rounded-2xl bg-[#0d0f0d] p-6 text-white ring-1 ring-white/10">
        {outcome?.ok ? (
          <div className="flex flex-col gap-4">
            <p className="text-lg font-medium">Withdrawal requested</p>
            <p className="text-sm text-white/70">
              {outcome.btc?.toFixed(4)} BTC to your wallet. Hearst validates every withdrawal before it leaves the vault — you will
              see it in your activity as pending until then.
            </p>
            <button type="button" onClick={onClose} className="vault-action vault-action--primary self-end">
              Done
            </button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-medium">Withdraw bitcoin</p>
                <p className="text-sm text-white/60">To your registered wallet, after Hearst’s validation.</p>
              </div>
              <button type="button" onClick={onClose} className="text-xl text-white/50 hover:text-white" aria-label="Close">
                ×
              </button>
            </div>
            <label className="flex flex-col gap-1.5 text-sm text-white/70">
              Amount (BTC)
              <div className="flex items-center gap-2">
                <input
                  name="amountBtc"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 flex-1 rounded-lg bg-white/5 px-3 text-base text-white ring-1 ring-white/15 outline-none focus:ring-[#9eea7a]"
                />
                <button
                  type="button"
                  onClick={() => setAmount(maxBtc)}
                  className="h-11 rounded-lg px-3 text-xs text-white/70 ring-1 ring-white/15 hover:bg-white/5"
                >
                  Max
                </button>
              </div>
            </label>
            <p className="text-xs text-white/50">
              Available: {maxBtc} BTC{usd !== null ? ` · this request ≈ $${Math.round(usd).toLocaleString('en-US')}` : ''}
            </p>
            {outcome?.ok === false ? <p className="text-sm text-amber-300">{outcome.error}</p> : null}
            <button type="submit" disabled={pending} className="vault-action vault-action--primary self-end disabled:opacity-50">
              {pending ? 'Sending…' : 'Request the withdrawal'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
