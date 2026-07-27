'use server'

import { getSession } from '@/lib/session'
import { callBackend, type CallTrace, type KeeperActionResult, type Problem } from './client'
import { toBackendRole } from './auth'
import { endpointById } from './endpoints'
import { z } from 'zod'

/**
 * Server Actions des routes Keeper.
 *
 * Fail-closed, sans exception :
 *   - rien ne part sans confirmation explicite de l'opérateur ;
 *   - aucun succès n'est affiché avant la réponse du serveur ;
 *   - aucun hash de transaction n'est fabriqué — aucune de ces routes ne signe
 *     de transaction, le backend n'ayant aucun helper d'écriture on-chain ;
 *   - la réponse du backend est rendue telle quelle, y compris un 501.
 */

export type KeeperOutcome = {
  ok: boolean
  endpointId: string
  /** Réponse brute du backend, affichée sans réinterprétation. */
  result: KeeperActionResult | null
  problem: Problem | null
  stateReason: string | null
  trace: CallTrace | null
  /** Erreur de validation locale, avant tout appel réseau. */
  validationError: string | null
}

/** Schémas alignés sur la validation `.strict()` du backend. */
const SCHEMAS: Record<string, z.ZodType> = {
  'keeper-mining-report': z
    .object({
      hashrateTh: z.number().int().nonnegative(),
      btcEarnedSats: z.number().int().nonnegative(),
    })
    .strict(),
}

function parseNumber(form: FormData, field: string): number | null {
  const raw = form.get(field)
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function parseString(form: FormData, field: string): string {
  const raw = form.get(field)
  return typeof raw === 'string' ? raw : ''
}

/**
 * Exécute une action Keeper. `confirm` doit valoir exactement "CONFIRMER" :
 * une soumission accidentelle ne déclenche aucun appel.
 */
export async function runKeeperAction(_prev: KeeperOutcome | null, form: FormData): Promise<KeeperOutcome> {
  const endpointId = parseString(form, 'endpointId')
  const base: KeeperOutcome = {
    ok: false,
    endpointId,
    result: null,
    problem: null,
    stateReason: null,
    trace: null,
    validationError: null,
  }

  let endpoint
  try {
    endpoint = endpointById(endpointId)
  } catch {
    return { ...base, validationError: 'Endpoint hors registre.' }
  }
  if (endpoint.category !== 'keeper') {
    return { ...base, validationError: "Cette action n'est pas une route Keeper." }
  }

  if (parseString(form, 'confirm') !== 'CONFIRMER') {
    return { ...base, validationError: 'Confirmation absente : aucune requête n’a été émise.' }
  }

  // Le rôle est revérifié ici, indépendamment de ce que l'UI a bien voulu rendre.
  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ...base, validationError: 'Rôle administrateur requis pour exécuter une action Keeper.' }
  }

  let body: unknown = {}
  const schema = SCHEMAS[endpointId]
  if (schema) {
    const candidate = {
      hashrateTh: parseNumber(form, 'hashrateTh'),
      btcEarnedSats: parseNumber(form, 'btcEarnedSats'),
    }
    const parsed = schema.safeParse(candidate)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')
      return { ...base, validationError: `Requête invalide au regard du contrat : ${issues}.` }
    }
    body = parsed.data
  }

  const response = await callBackend<KeeperActionResult>(endpointId, { body })

  if (!response.ok) {
    return {
      ...base,
      result: response.keeper,
      problem: response.problem,
      stateReason: response.state.reason,
      trace: response.trace,
    }
  }

  // Un 2xx n'est PAS une réussite d'opération : le corps porte le vrai statut.
  return { ...base, ok: true, result: response.data ?? null, trace: response.trace }
}
