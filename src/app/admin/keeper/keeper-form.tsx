'use client'

import { Card } from '@/components/admin/cockpit'
import { ProblemState, RequestMetadata } from '@/components/admin/truthful'
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
  return (
    <>
      {needsMetrics ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-600">Hashrate déclaré — entier ≥ 0</span>
            <input
              name="hashrateTh"
              type="number"
              min={0}
              step={1}
              required
              className="focus-visible:outline-accent-400 mt-2 w-full border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm text-zinc-950"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">Satoshis produits — entier ≥ 0</span>
            <input
              name="btcEarnedSats"
              type="number"
              min={0}
              step={1}
              required
              className="focus-visible:outline-accent-400 mt-2 w-full border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm text-zinc-950"
            />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="text-xs text-zinc-600">
          Saisir <span className="font-medium text-zinc-950">CONFIRMER</span> pour émettre la requête
        </span>
        <input
          name="confirm"
          type="text"
          autoComplete="off"
          placeholder="CONFIRMER"
          className="focus-visible:outline-accent-400 mt-2 w-full border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 sm:max-w-xs"
        />
      </label>
    </>
  )
}

function KeeperOutcomePanel({ outcome }: Readonly<{ outcome: KeeperOutcome }>) {
  if (outcome.validationError) {
    return (
      <div className="border-hairline mt-5 border-t pt-5">
        <p className="text-xs text-zinc-700">{outcome.validationError}</p>
      </div>
    )
  }

  return (
    <div className="border-hairline mt-5 border-t pt-5">
      {/* Le statut affiché est celui du corps de réponse, jamais « réussi »
          déduit d'un HTTP 2xx. */}
      <p className="text-xs text-zinc-600">
        Réponse backend :{' '}
        <span className="font-medium text-zinc-950">{outcome.result?.status ?? outcome.stateReason ?? '—'}</span>
      </p>
      {outcome.result?.reason ? <p className="mt-1 text-xs text-zinc-600">Motif : {outcome.result.reason}</p> : null}
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
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-normal tracking-tight text-zinc-950">{endpoint.summary}</h2>
          <p className="mt-2 font-mono text-xs text-zinc-600">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <span className="text-xs text-zinc-600">{disabled ? 'Action inerte' : 'Action disponible'}</span>
      </div>

      {endpoint.caveat ? (
        <p className="mt-5 border-l border-zinc-950 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-700">
          {endpoint.caveat}
        </p>
      ) : null}

      {disabled ? (
        <p className="border-hairline mt-5 border bg-zinc-50 px-4 py-3 text-xs text-zinc-600">{disabledReason}</p>
      ) : (
        <form action={formAction} className="mt-6 space-y-5">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          <KeeperActionFields needsMetrics={needsMetrics} />
          <button
            type="submit"
            disabled={pending}
            className="focus-visible:outline-accent-400 border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pending ? 'Envoi…' : 'Émettre la requête'}
          </button>
        </form>
      )}

      {outcome ? <KeeperOutcomePanel outcome={outcome} /> : null}
    </Card>
  )
}
