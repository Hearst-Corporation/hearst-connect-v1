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
    <div className="border-b border-white/5 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">{endpoint.method}</span>
        <span className="font-mono text-xs break-all text-white">{endpoint.path}</span>
        <span className="text-xs text-zinc-500">{endpoint.category}</span>
        <span className="text-xs text-zinc-500">· {authLabel}</span>

        <form action={formAction} className="ml-auto">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {endpoint.method === 'POST' ? (
            <span className="text-xs text-zinc-500">action Keeper — exécutable depuis la page Keeper</span>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="rounded border border-white/15 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
            >
              {pending ? 'Appel…' : 'Appeler'}
            </button>
          )}
        </form>
      </div>

      <p className="mt-1 text-xs text-zinc-500">{endpoint.summary}</p>

      {outcome ? (
        <div className="mt-3 rounded bg-cockpit-inset p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={outcome.status} />
            {outcome.metaStatus ? <span className="text-xs text-zinc-400">enveloppe : {outcome.metaStatus}</span> : null}
          </div>
          {outcome.reason ? <p className="mt-2 text-xs text-zinc-400">{outcome.reason}</p> : null}
          <div className="mt-2">
            <RequestMetadata trace={outcome.trace} />
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">JSON brut</summary>
            <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs text-zinc-300">{outcome.rawJson}</pre>
          </details>
        </div>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">cURL (jeton expurgé)</summary>
        <pre className="mt-1 overflow-x-auto rounded bg-cockpit-inset p-2 font-mono text-xs text-zinc-400">{curl}</pre>
      </details>
    </div>
  )
}
