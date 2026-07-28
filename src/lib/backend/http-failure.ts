import { resolved, type Resolved } from '@/lib/resolved'

/**
 * Traduit un échec HTTP backend en état nommé.
 *
 * Le statut HTTP prime sur le corps : un 403 peut porter un Problem annonçant
 * 401 — lire `code` confondrait « non authentifié » et « droits insuffisants ».
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
  const sessionAbsente = messages?.sessionAbsente ?? 'Session absente ou expirée.'

  if (httpStatus === 501) {
    const reason = isKeeperLike(body) ? (body.reason ?? 'not_supported_by_contract') : 'not_supported_by_contract'
    return resolved.notSupported(detail ?? `Non implémenté par le backend (${reason}).`, provenance)
  }

  switch (httpStatus) {
    case 401:
      return resolved.permissionDenied(detail ?? sessionAbsente, provenance)
    case 403:
      return resolved.permissionDenied(detail ?? 'Droits insuffisants : rôle administrateur requis.', provenance)
    case 429:
      return resolved.unavailable(detail ?? 'Quota de requêtes dépassé.', provenance)
    case 503:
      return isProblemLike(body) && body.code === 'NOT_CONFIGURED'
        ? resolved.notConfigured(detail ?? 'Source non configurée côté backend.', provenance)
        : resolved.unavailable(detail ?? 'Backend temporairement indisponible.', provenance)
    case 504:
      return resolved.unavailable(detail ?? 'Délai dépassé côté passerelle.', provenance)
    default:
      return resolved.error(detail ?? `Erreur backend (HTTP ${httpStatus}).`, provenance)
  }
}
