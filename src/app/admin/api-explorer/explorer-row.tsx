'use client'

import { surfaceInset } from '@/components/admin/surface'
import { AdminProbeResult } from '@/components/admin/surfaces'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { probeEndpoint, type ProbeOutcome } from '@/lib/backend/probe'
import clsx from 'clsx'
import { useActionState } from 'react'

function authLabelFor(auth: BackendEndpoint['auth']): string {
  if (auth === 'public') return 'public'
  if (auth === 'admin') return 'admin requis'
  return 'session requise'
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text)}
      className="rounded border border-console-line px-2 py-0.5 text-xs text-fg-secondary hover:bg-console-inset hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
    >
      Copier
    </button>
  )
}

/**
 * Text shown in place of the button when the row isn't runnable.
 * `null` when the route reads as-is.
 */
function unrunnableLabel(method: BackendEndpoint['method'], pathParams: readonly string[]): string | null {
  if (method === 'POST') return 'Action Keeper — page Keeper'
  // The registry's caveat already says where the value comes from: here we
  // only announce that it's missing, without repeating it.
  if (pathParams.length > 0) {
    const params = pathParams.map((name) => `:${name}`).join(', ')
    return `parameter ${params} required — not enterable here`
  }
  return null
}

export function ExplorerRow({
  endpoint,
  curl,
  pathParams,
}: Readonly<{ endpoint: BackendEndpoint; curl: string; pathParams: readonly string[] }>) {
  const [outcome, formAction, pending] = useActionState<ProbeOutcome | null, FormData>(probeEndpoint, null)

  const authLabel = authLabelFor(endpoint.auth)
  const isKeeper = endpoint.category === 'keeper'
  const blockedLabel = unrunnableLabel(endpoint.method, pathParams)

  return (
    <div className="border-b border-console-line-soft px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={clsx(surfaceInset, 'px-1.5 py-0.5 font-mono text-xs text-white')}>{endpoint.method}</span>
        <span className="font-mono text-xs break-all text-ink dark:text-fg">{endpoint.path}</span>
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">{endpoint.category}</span>
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">· {authLabel}</span>

        <form action={formAction} className="ml-auto">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {blockedLabel !== null ? (
            <span className="text-xs text-fg-tertiary dark:text-fg-secondary">{blockedLabel}</span>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="rounded border border-console-line px-2 py-1 text-xs text-fg-secondary hover:bg-console-inset hover:text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              {pending ? 'Calling…' : 'Run'}
            </button>
          )}
        </form>
      </div>

      <p className="mt-1 text-xs text-fg-tertiary dark:text-fg-secondary">{endpoint.summary}</p>
      {endpoint.caveat ? <p className="mt-1 text-xs text-warning-400">{endpoint.caveat}</p> : null}

      {outcome ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <CopyButton text={outcome.rawJson} />
            {outcome.metaStatus ? (
              <span className="text-xs text-fg-tertiary dark:text-fg-secondary">enveloppe : {outcome.metaStatus}</span>
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
        <summary className="cursor-pointer text-xs text-fg-tertiary dark:text-fg-secondary hover:text-ink dark:hover:text-white">cURL (token redacted)</summary>
        <pre className={clsx(surfaceInset, 'mt-1 overflow-x-auto p-2 font-mono text-xs text-fg-secondary')}>{curl}</pre>
      </details>

      {isKeeper ? (
        <p className="mt-2 text-xs text-warning-400">
          Side-effect action — run and confirm from /admin/keeper only.
        </p>
      ) : null}
    </div>
  )
}
