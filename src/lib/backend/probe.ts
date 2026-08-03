'use server'

import type { ResolvedStatus } from '@/lib/resolved'
import { getSession } from '@/lib/session'
import { callBackend, statusFromMeta, type CallTrace } from './client'
import { BACKEND_ENDPOINTS, type BackendEndpoint } from './endpoints'

/**
 * Single call triggered from the API Explorer.
 *
 * Reserved for reads: a Keeper action only executes from its dedicated page,
 * behind explicit confirmation.
 *
 * Fail-closed: no path of this action throws. An entry outside the contract
 * (unknown id, non-readable method, parameterized path without a parameter)
 * is a named `ProbeOutcome`, not an exception — a Server Action that throws
 * falls into the error boundary and loses the explanation along the way.
 */

export type ProbeOutcome = {
  endpointId: string
  status: ResolvedStatus
  metaStatus: string | null
  reason: string | null
  rawJson: string
  trace: CallTrace
}

/** Path parameters declared by the registry, `:name` syntax. */
const PATH_PARAM = /:(\w+)/g

/** The registry is the only source: reads without throwing, unlike `endpointById`. */
function findEndpoint(id: string): BackendEndpoint | null {
  return BACKEND_ENDPOINTS.find((endpoint) => endpoint.id === id) ?? null
}

/**
 * Names of a route's path parameters, read from `endpoint.path`.
 * Inspects the registry without modifying it or duplicating its syntax
 * elsewhere.
 */
function pathParamNames(path: string): string[] {
  return [...path.matchAll(PATH_PARAM)].map(([, name]) => name)
}

/**
 * Honest trace of a call that never happened: no HTTP status, no requestId,
 * zero duration. Never a fake 200.
 */
function traceWithoutCall(method: string, path: string): CallTrace {
  return {
    method,
    path,
    httpStatus: null,
    durationMs: 0,
    requestId: null,
    rateLimitRemaining: null,
    at: new Date().toISOString(),
  }
}

function refusal(
  endpointId: string,
  status: ResolvedStatus,
  reason: string,
  trace: CallTrace,
): ProbeOutcome {
  return { endpointId, status, metaStatus: null, reason, rawJson: 'null', trace }
}

export async function probeEndpoint(_prev: ProbeOutcome | null, form: FormData): Promise<ProbeOutcome> {
  // ARCH-01 / BAPI-01: a Server Action does NOT traverse the /admin layout, so
  // the route guard does not protect it. Without this check the action runs for
  // an anonymous caller (proven by replay in the audit). The guard is explicit
  // and independent, like `runKeeperAction` in keeper.ts — a Server Action must
  // never rely on a layout for its authorization. Fail-closed, non-throwing.
  const session = await getSession()
  if (!session) {
    return refusal(
      '',
      'PERMISSION_DENIED',
      'No session: the API Explorer only runs for an authenticated administrator.',
      traceWithoutCall('—', '—'),
    )
  }

  // Untrusted input from a form field. `FormData.get` may return a File; a
  // non-string field is treated as an empty id, never coerced to "[object File]".
  const rawEndpointId = form.get('endpointId')
  const endpointId = typeof rawEndpointId === 'string' ? rawEndpointId : ''

  const endpoint = findEndpoint(endpointId)
  if (!endpoint) {
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      endpointId
        ? `Endpoint unknown to the registry: "${endpointId}". No request was sent.`
        : 'No endpoint designated by the form. No request was sent.',
      traceWithoutCall('—', '—'),
    )
  }

  if (endpoint.method !== 'GET') {
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      'The API Explorer only executes reads: this route runs from its dedicated page.',
      traceWithoutCall(endpoint.method, endpoint.path),
    )
  }

  // A parameterized path cannot be called from the Explorer: legitimate
  // values come from a backend response, never from an input. Without them,
  // `resolvePath` would throw — this refuses beforehand, with the explanation.
  const missingParams = pathParamNames(endpoint.path)
  if (missingParams.length > 0) {
    const labels = missingParams.map((name) => `"${name}"`).join(', ')
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      `Parameterized route: ${labels} cannot be guessed here. No request was sent.`,
      traceWithoutCall(endpoint.method, endpoint.path),
    )
  }

  const result = await callBackend(endpointId)

  if (!result.ok) {
    return {
      endpointId,
      status: result.state.status,
      metaStatus: null,
      reason: result.state.reason,
      rawJson: JSON.stringify(result.problem ?? result.keeper ?? null, null, 2),
      trace: result.trace,
    }
  }

  return {
    endpointId,
    status: statusFromMeta(result.meta),
    metaStatus: result.meta?.status ?? null,
    reason: result.meta?.reason ?? null,
    rawJson: JSON.stringify(result.data, null, 2),
    trace: result.trace,
  }
}
