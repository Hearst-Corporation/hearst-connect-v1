'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import { useToast } from '@/components/admin/toast'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useCallback } from 'react'

export function RebalanceNowButton({ disabled, disabledReason }: Readonly<{ disabled?: boolean; disabledReason?: string | null }>) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [lastOutcome, setLastOutcome] = useState<KeeperOutcome | null>(null)

  const handleClick = useCallback(() => {
    if (disabled) return
    if (!window.confirm('Log a rebalance request with the keeper? No on-chain transaction is signed.')) return

    const form = new FormData()
    form.set('endpointId', 'keeper-rebalancing-execute')
    form.set('confirm', 'CONFIRM')

    startTransition(async () => {
      const outcome = await runKeeperAction(null, form)
      setLastOutcome(outcome)

      if (outcome.ok && outcome.result?.status === 'success') {
        const txHash = (outcome.result as { txHash?: string }).txHash
        showToast(txHash ? `Keeper logged rebalance: ${txHash}` : 'Keeper logged rebalance request', { type: 'success' })
        router.refresh()
        return
      }

      if (outcome.ok && outcome.result?.status === 'blocked') {
        showToast(`Rebalance blocked: ${outcome.result.detail ?? outcome.result.reason}`, { type: 'error' })
        return
      }

      if (outcome.validationError) {
        showToast(outcome.validationError, { type: 'error' })
        return
      }

      const detail = outcome.problem?.detail ?? outcome.stateReason ?? outcome.result?.reason ?? 'Request failed'
      showToast(detail, { type: 'error' })
    })
  }, [disabled, router, showToast])

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        title={disabledReason ?? undefined}
        color="accent"
        className="w-full"
      >
        {isPending ? 'Logging…' : 'Request rebalance'}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-xs text-(--ds-shell-subtle)">{disabledReason}</p>
      ) : lastOutcome?.ok && lastOutcome.result?.status === 'success' ? (
        <p className="text-xs text-(--ds-success)">Keeper request logged. Data will refresh shortly.</p>
      ) : lastOutcome?.ok && lastOutcome.result?.status === 'blocked' ? (
        <p className="text-xs text-(--ds-warning)">Blocked: {lastOutcome.result.detail ?? lastOutcome.result.reason}</p>
      ) : lastOutcome && (!lastOutcome.ok || lastOutcome.result?.status !== 'success') ? (
        <p className="text-xs text-(--ds-danger)">
          {lastOutcome.validationError ?? lastOutcome.problem?.detail ?? lastOutcome.stateReason ?? lastOutcome.result?.reason ?? 'Failed'}
        </p>
      ) : null}
    </div>
  )
}
