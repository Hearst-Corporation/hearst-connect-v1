'use client'

import { actionButtonClass } from '@/components/admin/forms/admin-action-form'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import clsx from 'clsx'
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
    if (!window.confirm('Execute rebalance on-chain?')) return

    const form = new FormData()
    form.set('endpointId', 'keeper-rebalancing-execute')
    form.set('confirm', 'CONFIRM')

    startTransition(async () => {
      const outcome = await runKeeperAction(null, form)
      setLastOutcome(outcome)

      if (outcome.ok && outcome.result?.status === 'success') {
        const txHash = (outcome.result as { txHash?: string }).txHash
        showToast(txHash ? `Rebalance submitted: ${txHash}` : 'Rebalance submitted', { type: 'success' })
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
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        title={disabledReason ?? undefined}
        className={clsx(actionButtonClass, 'w-full')}
      >
        {isPending ? 'Executing…' : 'Rebalance Now'}
      </button>
      {disabled && disabledReason ? (
        <p className="text-xs text-fg-tertiary">{disabledReason}</p>
      ) : lastOutcome?.ok && lastOutcome.result?.status === 'success' ? (
        <p className="text-xs text-success-400">Rebalance submitted. Data will refresh shortly.</p>
      ) : lastOutcome?.ok && lastOutcome.result?.status === 'blocked' ? (
        <p className="text-xs text-warning-400">Blocked: {lastOutcome.result.detail ?? lastOutcome.result.reason}</p>
      ) : lastOutcome && (!lastOutcome.ok || lastOutcome.result?.status !== 'success') ? (
        <p className="text-xs text-danger-400">
          {lastOutcome.validationError ?? lastOutcome.problem?.detail ?? lastOutcome.stateReason ?? lastOutcome.result?.reason ?? 'Failed'}
        </p>
      ) : null}
    </div>
  )
}
