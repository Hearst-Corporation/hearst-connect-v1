'use server'

import type { ResolvedStatus } from '@/lib/resolved'
import { callBackend, statusFromMeta, type CallTrace } from './client'
import { BACKEND_ENDPOINTS, type BackendEndpoint } from './endpoints'

/**
 * Appel unitaire déclenché depuis l'API Explorer.
 *
 * Réservé aux lectures : une action Keeper ne s'exécute que depuis sa page
 * dédiée, derrière confirmation explicite.
 *
 * Fail-closed : aucun chemin de cette action ne lève. Une entrée hors contrat
 * (id inconnu, méthode non lisible, chemin paramétré sans paramètre) est un
 * `ProbeOutcome` nommé, pas une exception — une Server Action qui lève tombe
 * dans l'error boundary et perd l'explication au passage.
 */

export type ProbeOutcome = {
  endpointId: string
  status: ResolvedStatus
  metaStatus: string | null
  reason: string | null
  rawJson: string
  trace: CallTrace
}

/** Paramètres de chemin déclarés par le registre, syntaxe `:nom`. */
const PATH_PARAM = /:(\w+)/g

/** Le registre est la seule source : lecture sans lever, contrairement à `endpointById`. */
function findEndpoint(id: string): BackendEndpoint | null {
  return BACKEND_ENDPOINTS.find((endpoint) => endpoint.id === id) ?? null
}

/**
 * Noms des paramètres de chemin d'une route, lus depuis `endpoint.path`.
 * Inspection du registre, sans le modifier ni dupliquer sa syntaxe ailleurs.
 */
function pathParamNames(path: string): string[] {
  return [...path.matchAll(PATH_PARAM)].map(([, name]) => name)
}

/**
 * Trace honnête d'un appel qui n'a pas eu lieu : pas de statut HTTP, pas de
 * requestId, durée nulle. Jamais un faux 200.
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
  const rawEndpointId = form.get('endpointId')
  const endpointId = typeof rawEndpointId === 'string' ? rawEndpointId : ''

  // `endpointId` vient d'un champ de formulaire : il est contrôlé par le
  // client, donc traité comme une entrée non fiable.
  const endpoint = findEndpoint(endpointId)
  if (!endpoint) {
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      endpointId
        ? `Endpoint inconnu du registre : « ${endpointId} ». Aucune requête n'a été émise.`
        : "Aucun endpoint désigné par le formulaire. Aucune requête n'a été émise.",
      traceWithoutCall('—', '—'),
    )
  }

  if (endpoint.method !== 'GET') {
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      "L'API Explorer n'exécute que des lectures : cette route s'exécute depuis sa page dédiée.",
      traceWithoutCall(endpoint.method, endpoint.path),
    )
  }

  // Un chemin paramétré ne peut pas être appelé depuis l'Explorer : les valeurs
  // légitimes viennent d'une réponse backend, jamais d'une saisie. Sans elles,
  // `resolvePath` lèverait — on refuse avant, avec l'explication.
  const missingParams = pathParamNames(endpoint.path)
  if (missingParams.length > 0) {
    const labels = missingParams.map((name) => `« ${name} »`).join(', ')
    return refusal(
      endpointId,
      'NOT_SUPPORTED',
      `Route paramétrée : ${labels} ne peut pas être deviné ici. Aucune requête n'a été émise.`,
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
