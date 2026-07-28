import { resolved, type Resolved } from '@/lib/resolved'

/**
 * Translates a backend HTTP failure into a named state.
 *
 * The HTTP status takes precedence over the body: a 403 can carry a Problem
 * announcing 401 — reading `code` would conflate "not authenticated" with
 * "insufficient rights".
 */

type ProblemLike = { readonly code?: string; readonly detail?: string; readonly requestId?: string }
type KeeperLike = { readonly reason?: string }

function isProblemLike(body: unknown): body is ProblemLike {
  return typeof body === 'object' && body !== null && 'detail' in body && 'requestId' in body
}

function isKeeperLike(body: unknown): body is KeeperLike {
  return typeof body === 'object' && body !== null && 'reason' in body && 'status' in body && !('code' in body)
}

export function stateForHttpFailure(
  httpStatus: number,
  body: unknown,
  route: string,
  requestId: string,
  messages?: Readonly<{ sessionAbsente?: string }>,
): Resolved<never> {
  const provenance = { route, requestId: isProblemLike(body) ? (body.requestId ?? requestId) : requestId }
  const detail = isProblemLike(body) ? (body.detail ?? null) : null
  const sessionAbsente = messages?.sessionAbsente ?? 'Session absent or expired.'

  if (httpStatus === 501) {
    const reason = isKeeperLike(body) ? (body.reason ?? 'not_supported_by_contract') : 'not_supported_by_contract'
    return resolved.notSupported(detail ?? `Not implemented by the backend (${reason}).`, provenance)
  }

  switch (httpStatus) {
    case 401:
      return resolved.permissionDenied(detail ?? sessionAbsente, provenance)
    case 403:
      return resolved.permissionDenied(detail ?? 'Insufficient rights: administrator role required.', provenance)
    case 429:
      return resolved.unavailable(detail ?? 'Request quota exceeded.', provenance)
    case 503:
      return isProblemLike(body) && body.code === 'NOT_CONFIGURED'
        ? resolved.notConfigured(detail ?? 'Source not configured on the backend.', provenance)
        : resolved.unavailable(detail ?? 'Backend temporarily unavailable.', provenance)
    case 504:
      return resolved.unavailable(detail ?? 'Timeout at the gateway.', provenance)
    default:
      return resolved.error(detail ?? `Backend error (HTTP ${httpStatus}).`, provenance)
  }
}
