'use client'

import { surfaceRaised } from '@/components/admin/surface'
import { ProblemState, RequestMetadata, StatusBadge } from '@/components/admin/truthful'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { runKeeperAction, type KeeperOutcome } from '@/lib/backend/keeper'
import { useActionState } from 'react'

/**
 * Formulaire d'action Keeper — fail-closed.
 *
 * L'opérateur doit saisir « CONFIRMER » : aucun clic isolé ne déclenche
 * d'appel. Tant que le backend n'a pas répondu, rien n'est présenté comme
 * exécuté, et aucun hash de transaction n'est jamais affiché.
 */
function KeeperActionFields({ needsMetrics }: Readonly<{ needsMetrics: boolean }>) {
  const fieldClass =
    'mt-1 w-full rounded-lg bg-zinc-50 px-2 py-1.5 text-sm text-zinc-950 ring-1 ring-zinc-950/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:bg-zinc-950/50 dark:text-white dark:ring-white/10'

  return (
    <>
      {needsMetrics ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">hashrateTh — entier ≥ 0</span>
            <input name="hashrateTh" type="number" min={0} step={1} required className={fieldClass} />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">btcEarnedSats — entier ≥ 0</span>
            <input name="btcEarnedSats" type="number" min={0} step={1} required className={fieldClass} />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Saisir <span className="font-mono text-amber-600 dark:text-amber-400">CONFIRMER</span> pour émettre la
          requête
        </span>
        <input
          name="confirm"
          type="text"
          autoComplete="off"
          placeholder="CONFIRMER"
          className={`${fieldClass} font-mono sm:max-w-xs`}
        />
      </label>
    </>
  )
}

function KeeperOutcomePanel({ outcome }: Readonly<{ outcome: KeeperOutcome }>) {
  if (outcome.validationError) {
    return (
      <div className="mt-4 border-t border-zinc-950/5 pt-4 dark:border-white/5">
        <p className="text-xs text-amber-600 dark:text-amber-400">{outcome.validationError}</p>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-zinc-950/5 pt-4 dark:border-white/5">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Réponse backend :{' '}
        <span className="font-mono text-zinc-950 dark:text-white">
          {outcome.result?.status ?? outcome.stateReason ?? '—'}
        </span>
      </p>
      {outcome.result?.reason ? (
        <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">reason : {outcome.result.reason}</p>
      ) : null}
      <ProblemState problem={outcome.problem} keeper={outcome.result} />
      {outcome.trace ? (
        <div className="mt-3">
          <RequestMetadata trace={outcome.trace} />
        </div>
      ) : null}
    </div>
  )
}

export function KeeperForm({
  endpoint,
  disabled,
  disabledReason,
}: Readonly<{ endpoint: BackendEndpoint; disabled: boolean; disabledReason: string | null }>) {
  const [outcome, formAction, pending] = useActionState<KeeperOutcome | null, FormData>(runKeeperAction, null)
  const needsMetrics = endpoint.id === 'keeper-mining-report'

  return (
    <section className={`${surfaceRaised} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <StatusBadge status={disabled ? 'NOT_CONFIGURED' : 'LIVE'} />
      </div>

      {endpoint.caveat ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
          {endpoint.caveat}
        </p>
      ) : null}

      {disabled ? (
        <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:text-zinc-400 dark:ring-white/5">
          {disabledReason}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          <KeeperActionFields needsMetrics={needsMetrics} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            {pending ? 'Envoi…' : 'Émettre la requête'}
          </button>
        </form>
      )}

      {outcome ? <KeeperOutcomePanel outcome={outcome} /> : null}
    </section>
  )
}
