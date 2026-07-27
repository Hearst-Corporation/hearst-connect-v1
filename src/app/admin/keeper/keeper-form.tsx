'use client'

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
export function KeeperForm({ endpoint, disabled, disabledReason }: Readonly<{ endpoint: BackendEndpoint; disabled: boolean; disabledReason: string | null }>) {
  const [outcome, formAction, pending] = useActionState<KeeperOutcome | null, FormData>(runKeeperAction, null)
  const needsMetrics = endpoint.id === 'keeper-mining-report'

  return (
    <section className="rounded-xl border border-white/10 bg-cockpit-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <StatusBadge status={disabled ? 'NOT_CONFIGURED' : 'LIVE'} />
      </div>

      {endpoint.caveat ? (
        <p className="mt-3 rounded border border-hearst-warn/25 bg-hearst-warn/5 px-3 py-2 text-xs text-hearst-warn">
          {endpoint.caveat}
        </p>
      ) : null}

      {disabled ? (
        <p className="mt-4 rounded border border-white/10 bg-cockpit-inset px-3 py-2 text-xs text-zinc-400">
          {disabledReason}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="endpointId" value={endpoint.id} />

          {needsMetrics ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-zinc-400">hashrateTh — entier ≥ 0</span>
                <input
                  name="hashrateTh"
                  type="number"
                  min={0}
                  step={1}
                  required
                  className="mt-1 w-full rounded border border-white/10 bg-cockpit-inset px-2 py-1.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">btcEarnedSats — entier ≥ 0</span>
                <input
                  name="btcEarnedSats"
                  type="number"
                  min={0}
                  step={1}
                  required
                  className="mt-1 w-full rounded border border-white/10 bg-cockpit-inset px-2 py-1.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs text-zinc-400">
              Saisir <span className="font-mono text-hearst-warn">CONFIRMER</span> pour émettre la requête
            </span>
            <input
              name="confirm"
              type="text"
              autoComplete="off"
              placeholder="CONFIRMER"
              className="mt-1 w-full rounded border border-white/10 bg-cockpit-inset px-2 py-1.5 font-mono text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent sm:max-w-xs"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="rounded bg-hearst-accent px-3 py-1.5 text-sm font-semibold text-hearst-ink hover:bg-hearst-accent-light disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
          >
            {pending ? 'Envoi…' : 'Émettre la requête'}
          </button>
        </form>
      )}

      {outcome ? (
        <div className="mt-4 border-t border-white/5 pt-4">
          {outcome.validationError ? (
            <p className="text-xs text-hearst-warn">{outcome.validationError}</p>
          ) : (
            <>
              {/* Le statut affiché est celui du corps de réponse, jamais « réussi »
                  déduit d'un HTTP 2xx. */}
              <p className="text-xs text-zinc-400">
                Réponse backend :{' '}
                <span className="font-mono text-white">{outcome.result?.status ?? outcome.stateReason ?? '—'}</span>
              </p>
              {outcome.result?.reason ? (
                <p className="mt-1 font-mono text-xs text-zinc-400">reason : {outcome.result.reason}</p>
              ) : null}
              <ProblemState problem={outcome.problem} keeper={outcome.result} />
              {outcome.trace ? (
                <div className="mt-3">
                  <RequestMetadata trace={outcome.trace} />
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
