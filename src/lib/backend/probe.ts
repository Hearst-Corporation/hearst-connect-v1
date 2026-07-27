'use server'

import type { ResolvedStatus } from '@/lib/resolved'
import { callBackend, statusFromMeta, type CallTrace } from './client'
import { endpointById } from './endpoints'

/**
 * Appel unitaire déclenché depuis l'API Explorer.
 *
 * Réservé aux lectures : une action Keeper ne s'exécute que depuis sa page
 * dédiée, derrière confirmation explicite.
 */

export type ProbeOutcome = {
  endpointId: string
  status: ResolvedStatus
  metaStatus: string | null
  reason: string | null
  rawJson: string
  trace: CallTrace
}

export async function probeEndpoint(_prev: ProbeOutcome | null, form: FormData): Promise<ProbeOutcome> {
  const endpointId = String(form.get('endpointId') ?? '')
  const endpoint = endpointById(endpointId)

  if (endpoint.method !== 'GET') {
    throw new Error("L'API Explorer n'exécute que des lectures.")
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
