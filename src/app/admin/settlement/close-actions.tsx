'use client'

import { decideApproval } from '@/features/admin-approvals/actions'
import { payElectricity } from '@/lib/mining/actions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * LA CLÔTURE DU MOIS EN UN COUP D'ŒIL — où elle en est, et ses deux gestes en lot.
 *
 * Quatre étapes : le mois est calculé, les rewards sont validés, l'électricité
 * est payée, le mois clos est attesté sur le registre de réserve (Ethereum). « Approve all » et « Pay all » font la même
 * chose que les boutons de chaque ligne, vault par vault — chaque paiement reste
 * une transaction Fireblocks distincte, envoyée au payee de Settings.
 */
export function CloseActions({
  month,
  total,
  rewardIds,
  dues,
}: Readonly<{
  month: string
  total: number
  /** Les décisions de reward encore en attente ce mois-ci. */
  rewardIds: readonly string[]
  /** Les électricités dues : vault et montant en dollars. */
  dues: readonly Readonly<{ vaultId: string; amountUsd: number }>[]
}>) {
  const router = useRouter()
  const [running, start] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const approveAll = () =>
    start(async () => {
      setError(null)
      for (const [i, id] of rewardIds.entries()) {
        setProgress(`Approving ${i + 1} / ${rewardIds.length}…`)
        const form = new FormData()
        form.set('id', id)
        form.set('decision', 'approve')
        const out = await decideApproval(null, form)
        if (!out.ok) {
          setError(out.error)
          break
        }
      }
      setProgress(null)
      router.refresh()
    })

  const payAll = () =>
    start(async () => {
      setError(null)
      for (const [i, d] of dues.entries()) {
        setProgress(`Sending payment ${i + 1} / ${dues.length} to Fireblocks…`)
        const form = new FormData()
        form.set('amount', String(Math.round(d.amountUsd)))
        form.set('vaultId', d.vaultId)
        form.set('month', month)
        const out = await payElectricity(null, form)
        if (!out.ok) {
          setError(out.error)
          break
        }
      }
      setProgress(null)
      router.refresh()
    })

  const validated = total - rewardIds.length
  const paid = total - dues.length
  const steps = [
    { label: 'Calculated', detail: 'Fleet output split by vault', done: true },
    { label: 'Rewards validated', detail: `${validated} / ${total}`, done: rewardIds.length === 0 },
    { label: 'Electricity paid', detail: `${paid} / ${total} · via Fireblocks`, done: dues.length === 0 },
    // Le mois clos s'atteste sur le registre de réserve (Ethereum) : racine des lignes, totaux, rapport.
    {
      label: 'Attested on-chain',
      detail: rewardIds.length === 0 && dues.length === 0 ? 'Ready for the reserve registry · Ethereum' : 'When both are done',
      done: rewardIds.length === 0 && dues.length === 0,
    },
  ]

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--ud-radius-sm)] ring-1 ring-[var(--ud-line)]">
      {/* Quatre étapes égales, séparées d'un trait : la clôture se lit comme une frise. */}
      <ol className="grid grid-cols-2 gap-px bg-[var(--ud-line)] lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3 bg-[var(--ud-card)] px-5 py-4">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  s.done ? 'bg-[var(--hearst-green)] text-[var(--hearst-green-ink)]' : 'text-fg-tertiary ring-1 ring-[var(--ud-line)]'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={`text-sm ${s.done ? 'text-fg-secondary' : 'font-medium text-fg'}`}>{s.label}</span>
                <span className="text-[11px] text-fg-tertiary">{s.detail}</span>
              </span>
            </li>
          ))}
      </ol>
      {rewardIds.length > 0 || dues.length > 0 || progress || error ? (
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--ud-line)] px-5 py-3">
        <div className="flex flex-wrap gap-2">
          {rewardIds.length > 0 ? (
            <button type="button" disabled={running} onClick={approveAll} className="ud-cta inline-flex h-9 items-center disabled:opacity-50">
              Approve all rewards ({rewardIds.length})
            </button>
          ) : null}
          {dues.length > 0 ? (
            <button
              type="button"
              disabled={running}
              onClick={payAll}
              className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5 disabled:opacity-50"
            >
              Pay all electricity ({dues.length})
            </button>
          ) : null}
        </div>
        {progress ? <p className="text-xs text-fg-tertiary">{progress}</p> : null}
        {error ? <p className="text-xs text-amber-300">{error}</p> : null}
      </div>
      ) : null}
    </div>
  )
}
