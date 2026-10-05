'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { AdminProbeResult } from '@/components/admin/admin-probe-result'
import { surfaceInset } from '@/components/admin/surface'
import type { BackendEndpoint } from '@/lib/backend/endpoints'
import { probeEndpoint, type ProbeOutcome } from '@/lib/backend/probe'
import { useActionState } from 'react'

function authLabelFor(auth: BackendEndpoint['auth']): string {
  if (auth === 'public') return 'public'
  if (auth === 'admin') return 'admin required'
  return 'session required'
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  return (
    <Button outline size="xs" onClick={() => navigator.clipboard.writeText(text)}>
      Copy
    </Button>
  )
}

/**
 * Text shown in place of the button when the row isn't runnable.
 * `null` when the route reads as-is.
 */
function unrunnableLabel(method: BackendEndpoint['method'], pathParams: readonly string[]): string | null {
  if (method === 'POST') return 'Keeper action — Keeper page'
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
    <div className="border-b border-(--ds-divider) py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded bg-(--ds-surface-raised) px-1.5 py-0.5 font-mono text-xs font-medium text-(--ds-text)">{endpoint.method}</span>
        <span className="font-mono text-xs break-all text-(--ds-text)">{endpoint.path}</span>
        <span className="text-xs text-(--ds-text-subtle)">{endpoint.category}</span>
        <span className="text-xs text-(--ds-text-subtle)">· {authLabel}</span>

        <form action={formAction} className="ml-auto">
          <input type="hidden" name="endpointId" value={endpoint.id} />
          {blockedLabel !== null ? (
            <span className="text-xs text-(--ds-text-subtle)">{blockedLabel}</span>
          ) : (
            <Button type="submit" outline size="xs" disabled={pending}>
              {pending ? 'Calling…' : 'Run'}
            </Button>
          )}
        </form>
      </div>

      <p className="mt-1 text-xs text-(--ds-text-subtle)">{endpoint.summary}</p>
      {endpoint.caveat ? <p className="mt-1 text-xs text-(--ds-warning)">{endpoint.caveat}</p> : null}

      {outcome ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <CopyButton text={outcome.rawJson} />
            {outcome.metaStatus ? (
              <span className="text-xs text-(--ds-text-subtle)">envelope: {outcome.metaStatus}</span>
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
        <summary className="cursor-pointer text-xs text-(--ds-text-subtle) hover:text-(--ds-text)">cURL (token redacted)</summary>
        <pre className={`${surfaceInset} mt-1 overflow-x-auto p-2 font-mono text-xs text-(--ds-text-subtle)`}>{curl}</pre>
      </details>

      {isKeeper ? (
        <p className="mt-2 text-xs text-(--ds-warning)">
          Side-effect action — run and confirm from /admin/keeper only.
        </p>
      ) : null}
    </div>
  )
}
