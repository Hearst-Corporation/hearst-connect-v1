import { stateForHttpFailure } from './backend/http-failure'
import { resolved, type Resolved } from './resolved'

/**
 * Couche d'accès unique au backend Hearst Connect.
 *
 * Contrats respectés tels que définis par `docs/api.md` de
 * `Hearst-Corporation/hearst-connect-backend` :
 *   - `Envelope<T>` = `{ data, meta }` sur toutes les routes de données `/api/v1/*` ;
 *   - `Problem` = `{ type, title, status, code, detail, requestId }` sur les erreurs ;
 *   - deux exceptions documentées, traitées explicitement plus bas.
 *
 * Interdits absolus, garantis par construction :
 *   - aucun fallback métier, aucune valeur par défaut, aucun cache de secours ;
 *   - une erreur ne renvoie jamais la dernière valeur connue ;
 *   - une erreur n'est jamais avalée : elle devient un état nommé.
 */

/** Statuts d'enveloppe émis par le backend. */
export type EnvelopeStatus = 'LIVE' | 'SNAPSHOT' | 'STALE' | 'SIMULATED' | 'NOT_CONFIGURED' | 'UNAVAILABLE'

export type EnvelopeMeta = {
  status: EnvelopeStatus
  source: string
  generatedAt: string
  freshnessSeconds: number | null
  version: 'v1'
  reason: string | null
}

export type Envelope<T> = { data: T; meta: EnvelopeMeta }

/** `Resolved<T>` tel que le backend le sérialise (distinct du type d'affichage). */
export type BackendResolved<T> = {
  status: 'LIVE' | 'STALE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_CONFIGURED' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED'
  value: T | null
  provenance: 'live' | 'db' | 'indexed' | 'manual' | 'fixture'
  freshness: { asOf: string | null; ageSeconds: number | null; stale: boolean }
  reason?: string
}

export type Problem = {
  type: string
  title: string
  status: number
  code: string
  detail: string
  requestId: string
}

/** Réponse des routes Keeper — non enveloppée, sans `code`. */
export type KeeperActionResult = { status: string; reason: string; detail?: string }

const DEFAULT_TIMEOUT_MS = 10_000

function baseUrl(): string | null {
  const raw = process.env.HEARST_API_URL?.trim()
  if (!raw) return null
  let end = raw.length
  while (end > 0 && raw[end - 1] === '/') end -= 1
  return raw.slice(0, end)
}

function isProblem(body: unknown): body is Problem {
  return typeof body === 'object' && body !== null && 'code' in body && 'detail' in body && 'requestId' in body
}

function isEnvelope<T>(body: unknown): body is Envelope<T> {
  return typeof body === 'object' && body !== null && 'data' in body && 'meta' in body
}

export type ApiResult<T> =
  | { ok: true; data: T; meta: EnvelopeMeta | null; requestId: string | null; rateLimitRemaining: number | null }
  | { ok: false; failure: Resolved<never>; httpStatus: number | null }

/**
 * Exécute un GET sur une route `/api/v1/*` et rend soit la donnée réelle,
 * soit un état nommé. Jamais autre chose.
 */
export async function apiGet<T>(
  path: string,
  options: { enveloped?: boolean; token?: string | null; timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const { enveloped = true, token = process.env.HEARST_API_TOKEN ?? null, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const base = baseUrl()

  if (!base) {
    return {
      ok: false,
      httpStatus: null,
      failure: resolved.notConfigured(
        "HEARST_API_URL n'est pas défini sur ce déploiement : aucune requête n'est émise.",
        { route: path },
      ),
    }
  }

  const requestId = crypto.randomUUID()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Request-Id': requestId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError'
    return {
      ok: false,
      httpStatus: null,
      failure: resolved.unavailable(
        aborted ? `Le backend n'a pas répondu en ${timeoutMs} ms.` : 'Backend injoignable.',
        { route: path, requestId },
      ),
    }
  } finally {
    clearTimeout(timer)
  }

  const serverRequestId = response.headers.get('X-Request-Id') ?? requestId
  const rateHeader = response.headers.get('X-RateLimit-Remaining')
  const rateLimitRemaining = rateHeader === null ? null : Number.parseInt(rateHeader, 10)

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    return { ok: false, httpStatus: response.status, failure: failureFor(response.status, body, path, serverRequestId) }
  }

  if (!enveloped) {
    return { ok: true, data: body as T, meta: null, requestId: serverRequestId, rateLimitRemaining }
  }

  if (!isEnvelope<T>(body)) {
    return {
      ok: false,
      httpStatus: response.status,
      failure: resolved.error("Réponse 2xx hors contrat : enveloppe { data, meta } absente.", {
        route: path,
        requestId: serverRequestId,
      }),
    }
  }

  return { ok: true, data: body.data, meta: body.meta, requestId: serverRequestId, rateLimitRemaining }
}

function failureFor(httpStatus: number, body: unknown, route: string, requestId: string): Resolved<never> {
  return stateForHttpFailure(httpStatus, body, route, requestId)
}

/**
 * Convertit un `Resolved` backend en `Resolved` d'affichage.
 *
 * Une donnée annoncée `provenance: "fixture"` par le backend est marquée
 * SIMULATED : elle ne doit jamais être présentée comme une mesure réelle.
 */
export function fromBackendResolved<T>(
  field: BackendResolved<T> | null | undefined,
  context: { route: string; field: string; fetchedAt: string | null; requestId: string | null },
): Resolved<T> {
  const provenance = { ...context }

  if (!field) {
    return resolved.notSupported('Champ absent de la réponse backend.', provenance)
  }

  if (field.provenance === 'fixture') {
    return {
      status: 'SIMULATED',
      value: null,
      reason: 'Donnée simulée côté backend — non exploitable en production.',
      provenance: { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt },
    }
  }

  const withFreshness = { ...provenance, fetchedAt: field.freshness.asOf ?? context.fetchedAt }
  const reason = field.reason ?? null

  switch (field.status) {
    case 'LIVE':
      return field.value === null
        ? resolved.error('Statut LIVE annoncé avec une valeur nulle.', withFreshness)
        : resolved.live(field.value, withFreshness)
    case 'STALE':
      return field.value === null
        ? resolved.error('Statut STALE annoncé avec une valeur nulle.', withFreshness)
        : resolved.stale(field.value, reason ?? 'Fraîcheur insuffisante.', withFreshness)
    case 'PARTIAL':
      return field.value === null
        ? resolved.error('Statut PARTIAL annoncé avec une valeur nulle.', withFreshness)
        : resolved.partial(field.value, reason ?? 'Réponse partielle.', withFreshness)
    case 'NOT_CONFIGURED':
      return resolved.notConfigured(reason ?? 'Source non configurée.', withFreshness)
    case 'NOT_SUPPORTED':
      return resolved.notSupported(reason ?? 'Non supporté par le contrat.', withFreshness)
    case 'PERMISSION_DENIED':
      return resolved.permissionDenied(reason ?? 'Droits insuffisants.', withFreshness)
    case 'UNAVAILABLE':
    default:
      return resolved.unavailable(reason ?? 'Donnée indisponible.', withFreshness)
  }
}
