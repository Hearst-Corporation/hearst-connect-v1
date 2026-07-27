'use client'

import { RequestMetadata, StatusBadge } from '@/components/admin/truthful'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { probeEndpoint, type ProbeOutcome } from '@/lib/backend/probe'
import { useActionState } from 'react'

/**
 * Ligne de l'API Explorer.
 *
 * Rien n'est appelé au chargement : l'opérateur déclenche chaque requête. Tant
 * qu'aucun appel n'a eu lieu, la colonne « dernier appel » reste vide — aucun
 * exemple statique ne se fait passer pour une réponse exécutée.
 */
function authLabelFor(auth: BackendEndpoint['auth']): string {
  if (auth === 'public') return 'publique'
  if (auth === 'admin') return 'admin requis'
  return 'session requise'
}

export function ExplorerRow({ endpoint, curl }: Readonly<{ endpoint: BackendEndpoint; curl: string }>) {
  const [outcome, formAction, pending] = useActionState<ProbeOutcome | null, FormData>(probeEndpoint, null)

  const authLabel = authLabelFor(endpoint.auth)

  return (
    <div className="border-hairline border-b px-5 py-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-medium tracking-[0.12em] text-zinc-950 uppercase">{endpoint.method}</span>
        <span className="font-mono text-xs break-all text-zinc-950">{endpoint.path}</span>
        <span className="text-xs text-zinc-600">{endpoint.category}</span>
        <span className="text-xs text-zinc-500">· {authLabel}</span>

        <form action={formAction} className="ml-auto">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {endpoint.method === 'POST' ? (
            <span className="text-xs text-zinc-500">Action Keeper — exécutable depuis la page Keeper</span>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="focus-visible:outline-accent-400 border border-zinc-950 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {pending ? 'Appel…' : 'Appeler'}
            </button>
          )}
        </form>
      </div>

      <p className="mt-2 max-w-3xl text-sm text-zinc-600">{endpoint.summary}</p>

      {outcome ? (
        <div className="border-hairline mt-5 border-t bg-zinc-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={outcome.status} />
            {outcome.metaStatus ? (
              <span className="text-xs text-zinc-600">Enveloppe : {outcome.metaStatus}</span>
            ) : null}
          </div>
          {outcome.reason ? <p className="mt-2 text-xs text-zinc-600">{outcome.reason}</p> : null}
          <div className="mt-2">
            <RequestMetadata trace={outcome.trace} />
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-950">JSON brut</summary>
            <pre className="border-hairline mt-2 max-h-72 overflow-auto border bg-white p-4 font-mono text-xs text-zinc-800">
              {outcome.rawJson}
            </pre>
          </details>
        </div>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-950">cURL (jeton expurgé)</summary>
        <pre className="border-hairline mt-2 overflow-x-auto border bg-zinc-50 p-4 font-sans text-xs text-zinc-700">
          {curl}
        </pre>
      </details>
    </div>
  )
}
