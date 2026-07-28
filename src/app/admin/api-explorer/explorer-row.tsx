'use client'

import { AdminProbeResult } from '@/components/admin/surfaces'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { probeEndpoint, type ProbeOutcome } from '@/lib/backend/probe'
import { useActionState } from 'react'

function authLabelFor(auth: BackendEndpoint['auth']): string {
  if (auth === 'public') return 'publique'
  if (auth === 'admin') return 'admin requis'
  return 'session requise'
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text)}
      className="rounded border border-brand-border/60 px-2 py-0.5 text-xs text-brand-muted hover:text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
    >
      Copier
    </button>
  )
}

export function ExplorerRow({ endpoint, curl }: Readonly<{ endpoint: BackendEndpoint; curl: string }>) {
  const [outcome, formAction, pending] = useActionState<ProbeOutcome | null, FormData>(probeEndpoint, null)

  const authLabel = authLabelFor(endpoint.auth)
  const isKeeper = endpoint.category === 'keeper'

  return (
    <div className="border-b border-brand-border/30 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-brand-foreground">{endpoint.method}</span>
        <span className="font-mono text-xs break-all text-brand-foreground">{endpoint.path}</span>
        <span className="text-xs text-brand-muted">{endpoint.category}</span>
        <span className="text-xs text-brand-muted">· {authLabel}</span>

        <form action={formAction} className="ml-auto">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {endpoint.method === 'POST' ? (
            <span className="text-xs text-brand-muted">action Keeper — page Keeper</span>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="rounded border border-brand-border/60 px-2 py-1 text-xs text-brand-muted hover:bg-white/5 hover:text-brand-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {pending ? 'Appel…' : 'Exécuter'}
            </button>
          )}
        </form>
      </div>

      <p className="mt-1 text-xs text-brand-muted">{endpoint.summary}</p>
      {endpoint.caveat ? <p className="mt-1 text-xs text-warning-400">{endpoint.caveat}</p> : null}

      {outcome ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <CopyButton text={outcome.rawJson} />
            {outcome.metaStatus ? (
              <span className="text-xs text-brand-muted">enveloppe : {outcome.metaStatus}</span>
            ) : null}
          </div>
          <AdminProbeResult
            status={outcome.status}
            reason={outcome.reason}
            trace={outcome.trace}
            rawJson={outcome.rawJson}
          />
        </div>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-brand-muted hover:text-brand-foreground">cURL (jeton expurgé)</summary>
        <pre className="mt-1 overflow-x-auto rounded bg-brand-background/60 p-2 font-mono text-xs text-brand-muted">{curl}</pre>
      </details>

      {isKeeper ? (
        <p className="mt-2 text-xs text-warning-400">
          Action avec effet de bord — exécution et confirmation depuis /admin/keeper uniquement.
        </p>
      ) : null}
    </div>
  )
}
