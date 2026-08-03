import 'server-only'

import { backendUrl } from '@/lib/env'
import { getSession } from '@/lib/session'
import { resolved, type Resolved } from '@/lib/resolved'
import { authorizationHeader, toBackendRole } from './auth'
import { BACKEND_ENDPOINTS, resolvePath, type BackendEndpoint } from './endpoints'
import { stateForHttpFailure } from './http-failure'

/**
 * Single client for the Hearst Connect backend. Server only.
 *
 * Guarantees, by construction:
 *   - no business fallback: an error becomes a named state, never a value;
 *   - no data from a previous call is ever re-served;
 *   - the token and signing key never leave the server;
 *   - the backend's statuses and provenances are passed through as-is.
 */

export type EnvelopeStatus = 'LIVE' | 'SNAPSHOT' | 'STALE' | 'SIMULATED' | 'NOT_CONFIGURED' | 'UNAVAILABLE'

export type EnvelopeMeta = {
  status: EnvelopeStatus
  source: string
  generatedAt: string
  freshnessSeconds: number | null
  version: string
  reason: string | null
}

export type Problem = {
  type: string
  title: string
  status: number
  code: string
  detail: string
  requestId: string
}

/** Response of Keeper routes: neither envelope nor `code` field. */
export type KeeperActionResult = { status: string; reason: string; detail?: string }

/** Call trace, displayed by the API Explorer. */
export type CallTrace = {
  method: string
  path: string
  httpStatus: number | null
  durationMs: number
  requestId: string | null
  rateLimitRemaining: number | null
  at: string
}

export type BackendResult<T> =
  | { ok: true; data: T; meta: EnvelopeMeta | null; trace: CallTrace }
  | { ok: false; state: Resolved<never>; problem: Problem | null; keeper: KeeperActionResult | null; trace: CallTrace }

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Backend base, read by the `@/lib/env` canon. No implicit fallback to
 * production: a missing URL is a state, never a default value.
 */
const baseUrl = backendUrl

const isProblem = (body: unknown): body is Problem =>
  typeof body === 'object' && body !== null && 'code' in body && 'detail' in body && 'requestId' in body

const isKeeperResult = (body: unknown): body is KeeperActionResult =>
  typeof body === 'object' && body !== null && 'reason' in body && 'status' in body && !('code' in body)

const isEnvelope = (body: unknown): body is { data: unknown; meta: EnvelopeMeta } =>
  typeof body === 'object' && body !== null && 'data' in body && 'meta' in body

function trace(endpoint: BackendEndpoint, path: string, startedAt: number, extra: Partial<CallTrace>): CallTrace {
  return {
    method: endpoint.method,
    path,
    httpStatus: null,
    durationMs: Math.round(performance.now() - startedAt),
    requestId: null,
    rateLimitRemaining: null,
    at: new Date().toISOString(),
    ...extra,
  }
}

/**
 * OPS-06: one structured, secret-free line per backend call.
 *
 * An operator needs to correlate what a user saw with the backend: the request
 * id, the route, the HTTP status, the duration and a named reason. What must
 * NEVER be logged is the Authorization header, the bearer token, the cookie,
 * the request body or any response value — so this only ever receives the
 * already-safe fields of the trace, never the payload. A failed log must not
 * fail a request, hence the try/catch.
 */
function logCall(t: CallTrace, outcome: 'ok' | 'error', reason: string | null): void {
  try {
    console.info(
      JSON.stringify({
        tag: 'backend-call',
        outcome,
        method: t.method,
        path: t.path,
        httpStatus: t.httpStatus,
        durationMs: t.durationMs,
        requestId: t.requestId,
        rateLimitRemaining: t.rateLimitRemaining,
        reason,
        at: t.at,
      }),
    )
  } catch {
    // Observability must never bring a request down.
  }
}

type AuthorizationOutcome =
  | { ok: true; authorization: string | null }
  | { ok: false; state: Resolved<never> }

/**
 * Resolves the authorization header of a non-public route, or the named
 * state explaining why it remains inaccessible. Isolated from `callBackend`
 * to keep its cognitive complexity under the allowed threshold.
 */
async function resolveAuthorization(endpoint: BackendEndpoint, path: string): Promise<AuthorizationOutcome> {
  if (endpoint.auth === 'public') {
    return { ok: true, authorization: null }
  }

  const session = await getSession()
  if (!session) {
    return { ok: false, state: resolved.permissionDenied('Frontend session absent or expired.', { route: path }) }
  }

  const backendRole = toBackendRole(session.role)
  if (!backendRole) {
    return {
      ok: false,
      state: resolved.permissionDenied(`Role ${session.role} does not open access to the backend.`, { route: path }),
    }
  }

  if (endpoint.auth === 'admin' && backendRole !== 'admin') {
    return {
      ok: false,
      state: resolved.permissionDenied('Administrator role required by this route.', { route: path }),
    }
  }

  // Single composition point for the header: `authorizationHeader` strips
  // any "Bearer" prefix already present in the stored value.
  return { ok: true, authorization: authorizationHeader(session.backendToken) }
}

/**
 * Calls a registry endpoint.
 *
 * `body` is only accepted for POST routes in the registry: a component
 * cannot fabricate an out-of-contract route.
 */
export async function callBackend<T = unknown>(
  endpointId: string,
  options: { params?: Record<string, string | number>; body?: unknown; timeoutMs?: number } = {},
): Promise<BackendResult<T>> {
  const endpoint = BACKEND_ENDPOINTS.find((e) => e.id === endpointId)
  if (!endpoint) {
    throw new Error(`Endpoint hors registre : "${endpointId}".`)
  }

  const startedAt = performance.now()
  const path = resolvePath(endpoint, options.params ?? {})
  const base = baseUrl()

  if (!base) {
    return {
      ok: false,
      problem: null,
      keeper: null,
      trace: trace(endpoint, path, startedAt, {}),
      state: resolved.notConfigured(
        'HEARST_API_URL is not defined on this deployment: no request is sent.',
        { route: path },
      ),
    }
  }

  // Bearer token issued by the backend, read from the server session. It is
  // neither fabricated nor derived here: the frontend no longer signs anything.
  const authOutcome = await resolveAuthorization(endpoint, path)
  if (!authOutcome.ok) {
    return {
      ok: false,
      problem: null,
      keeper: null,
      trace: trace(endpoint, path, startedAt, {}),
      state: authOutcome.state,
    }
  }
  const authorization = authOutcome.authorization

  const requestId = crypto.randomUUID()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: endpoint.method,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Request-Id': requestId,
        ...(authorization ? { Authorization: authorization } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError'
    const failTrace = trace(endpoint, path, startedAt, { requestId })
    logCall(failTrace, 'error', aborted ? 'timeout' : 'unreachable')
    return {
      ok: false,
      problem: null,
      keeper: null,
      trace: failTrace,
      state: resolved.unavailable(
        aborted ? `The backend did not respond within the allotted time.` : 'Backend unreachable.',
        { route: path, requestId },
      ),
    }
  } finally {
    clearTimeout(timer)
  }

  const serverRequestId = response.headers.get('X-Request-Id') ?? requestId
  const rateHeader = response.headers.get('X-RateLimit-Remaining')
  const rateLimitRemaining = rateHeader === null ? null : Number.parseInt(rateHeader, 10)
  const callTrace = trace(endpoint, path, startedAt, {
    httpStatus: response.status,
    requestId: serverRequestId,
    rateLimitRemaining: Number.isNaN(rateLimitRemaining) ? null : rateLimitRemaining,
  })
  logCall(callTrace, response.ok ? 'ok' : 'error', response.ok ? null : `http_${response.status}`)

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  return buildResult<T>(endpoint, response, body, path, serverRequestId, callTrace)
}

/**
 * Translates an already-received HTTP response into a `BackendResult`.
 * Isolated from `callBackend` to keep its cognitive complexity under the
 * allowed threshold.
 */
function buildResult<T>(
  endpoint: BackendEndpoint,
  response: Response,
  body: unknown,
  path: string,
  serverRequestId: string,
  callTrace: CallTrace,
): BackendResult<T> {
  if (!response.ok) {
    return {
      ok: false,
      problem: isProblem(body) ? body : null,
      keeper: isKeeperResult(body) ? body : null,
      trace: callTrace,
      state: stateForHttpFailure(response.status, body, path, serverRequestId, {
        sessionAbsente: 'Session absent, malformed, or expired.',
      }),
    }
  }

  if (!endpoint.enveloped) {
    return { ok: true, data: body as T, meta: null, trace: callTrace }
  }

  if (!isEnvelope(body)) {
    return {
      ok: false,
      problem: null,
      keeper: null,
      trace: callTrace,
      state: resolved.error('2xx response out of contract: { data, meta } envelope missing.', {
        route: path,
        requestId: serverRequestId,
      }),
    }
  }

  return { ok: true, data: body.data as T, meta: body.meta, trace: callTrace }
}

/** Backend envelope status → display status, without requalification. */
export function statusFromMeta(meta: EnvelopeMeta | null): Resolved<never>['status'] {
  if (!meta) return 'LIVE'
  switch (meta.status) {
    case 'LIVE':
      return 'LIVE'
    case 'SNAPSHOT':
    case 'STALE':
      return 'STALE'
    case 'SIMULATED':
      return 'SIMULATED'
    case 'NOT_CONFIGURED':
      return 'NOT_CONFIGURED'
    case 'UNAVAILABLE':
    default:
      return 'UNAVAILABLE'
  }
}
