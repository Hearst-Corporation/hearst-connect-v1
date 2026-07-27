import 'server-only'

import { backendUrl } from '@/lib/env'
import { getSession } from '@/lib/session'
import { resolved, type Resolved } from '@/lib/resolved'
import { authorizationHeader, toBackendRole } from './auth'
import { BACKEND_ENDPOINTS, resolvePath, type BackendEndpoint } from './endpoints'

/**
 * Client unique du backend Hearst Connect. Serveur uniquement.
 *
 * Garanties, par construction :
 *   - aucun repli métier : une erreur devient un état nommé, jamais une valeur ;
 *   - aucune donnée d'un appel précédent n'est resservie ;
 *   - le jeton et la clé de signature ne quittent pas le serveur ;
 *   - les statuts et provenances du backend sont transmis tels quels.
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

/** Réponse des routes Keeper : ni enveloppe, ni champ `code`. */
export type KeeperActionResult = { status: string; reason: string; detail?: string }

/** Trace d'appel, affichée par l'API Explorer. */
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
 * Base du backend, lue par le canon `@/lib/env`. Pas de repli implicite vers
 * la production : une URL absente est un état, jamais une valeur par défaut.
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
 * Appelle un endpoint du registre.
 *
 * `body` n'est accepté que pour les routes POST du registre : on ne peut pas
 * fabriquer une route hors contrat depuis un composant.
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
        "HEARST_API_URL n'est pas défini sur ce déploiement : aucune requête n'est émise.",
        { route: path },
      ),
    }
  }

  // Jeton porteur émis par le backend, lu dans la session serveur. Il n'est
  // ni fabriqué ni dérivé ici : le frontend ne signe plus rien.
  let authorization: string | null = null
  if (endpoint.auth !== 'public') {
    const session = await getSession()
    if (!session) {
      return {
        ok: false,
        problem: null,
        keeper: null,
        trace: trace(endpoint, path, startedAt, {}),
        state: resolved.permissionDenied('Session frontend absente ou expirée.', { route: path }),
      }
    }

    const backendRole = toBackendRole(session.role)
    if (!backendRole) {
      return {
        ok: false,
        problem: null,
        keeper: null,
        trace: trace(endpoint, path, startedAt, {}),
        state: resolved.permissionDenied(
          `Le rôle ${session.role} n'ouvre pas d'accès au backend.`,
          { route: path },
        ),
      }
    }

    if (endpoint.auth === 'admin' && backendRole !== 'admin') {
      return {
        ok: false,
        problem: null,
        keeper: null,
        trace: trace(endpoint, path, startedAt, {}),
        state: resolved.permissionDenied('Rôle administrateur requis par cette route.', { route: path }),
      }
    }

    // Composition unique de l'en-tête : `authorizationHeader` retire tout
    // préfixe « Bearer » déjà présent dans la valeur stockée.
    authorization = authorizationHeader(session.backendToken)
  }

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
    return {
      ok: false,
      problem: null,
      keeper: null,
      trace: trace(endpoint, path, startedAt, { requestId }),
      state: resolved.unavailable(
        aborted ? `Le backend n'a pas répondu dans le délai imparti.` : 'Backend injoignable.',
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

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    return {
      ok: false,
      problem: isProblem(body) ? body : null,
      keeper: isKeeperResult(body) ? body : null,
      trace: callTrace,
      state: stateForFailure(response.status, body, path, serverRequestId),
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
      state: resolved.error('Réponse 2xx hors contrat : enveloppe { data, meta } absente.', {
        route: path,
        requestId: serverRequestId,
      }),
    }
  }

  return { ok: true, data: body.data as T, meta: body.meta, trace: callTrace }
}

/**
 * Traduit un échec HTTP en état nommé.
 *
 * Le statut HTTP prime sur le corps : le backend documente qu'un 403 est servi
 * avec un corps `Problems.unauthorized(...)` annonçant `401`. Lire `code`
 * confondrait « non authentifié » et « droits insuffisants ».
 */
function stateForFailure(
  httpStatus: number,
  body: unknown,
  route: string,
  requestId: string,
): Resolved<never> {
  const provenance = { route, requestId: isProblem(body) ? body.requestId : requestId }
  const detail = isProblem(body) ? body.detail : null

  // 501 keeper : KeeperActionResult sans `code`, le motif est dans `reason`.
  if (httpStatus === 501) {
    const reason = isKeeperResult(body) ? body.reason : 'not_supported_by_contract'
    return resolved.notSupported(detail ?? `Non implémenté par le backend (${reason}).`, provenance)
  }

  switch (httpStatus) {
    case 401:
      return resolved.permissionDenied(detail ?? 'Session absente, malformée ou expirée.', provenance)
    case 403:
      return resolved.permissionDenied(detail ?? 'Droits insuffisants : rôle administrateur requis.', provenance)
    case 429:
      return resolved.unavailable(detail ?? 'Quota de requêtes dépassé.', provenance)
    case 503:
      return isProblem(body) && body.code === 'NOT_CONFIGURED'
        ? resolved.notConfigured(detail ?? 'Source non configurée côté backend.', provenance)
        : resolved.unavailable(detail ?? 'Backend temporairement indisponible.', provenance)
    case 504:
      return resolved.unavailable(detail ?? 'Délai dépassé côté passerelle.', provenance)
    default:
      return resolved.error(detail ?? `Erreur backend (HTTP ${httpStatus}).`, provenance)
  }
}

/** Statut d'enveloppe backend → statut d'affichage, sans requalification. */
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
