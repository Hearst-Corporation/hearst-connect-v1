'use server'

import { getSession } from '@/lib/session'
import { callBackend, type CallTrace, type KeeperActionResult, type Problem } from './client'
import { toBackendRole } from './auth'
import { endpointById } from './endpoints'
import { z } from 'zod'

/**
 * Server Actions for the Keeper routes.
 *
 * Fail-closed, no exceptions:
 *   - nothing is sent without the operator's explicit confirmation;
 *   - no success is shown before the server responds;
 *   - no transaction hash is fabricated — none of these routes sign a
 *     transaction, the backend has no on-chain write helper;
 *   - the backend's response is rendered as-is, including a 501.
 */

export type KeeperOutcome = {
  ok: boolean
  endpointId: string
  /** Raw backend response, shown without reinterpretation. */
  result: KeeperActionResult | null
  problem: Problem | null
  stateReason: string | null
  trace: CallTrace | null
  /** Local validation error, before any network call. */
  validationError: string | null
}

/** Schemas aligned with the backend's `.strict()` validation. */
const SCHEMAS: Record<string, z.ZodType> = {
  'keeper-mining-report': z
    .object({
      hashrateTh: z.number().int().nonnegative(),
      btcEarnedSats: z.number().int().nonnegative(),
    })
    .strict(),
  'mining-distribution-approve': z.object({ id: z.string().min(1) }).strict(),
  'mining-calculation-trigger': z
    .object({
      period: z.string().regex(/^\d{4}-\d{2}$/, 'must be "YYYY-MM"'),
      rwaStrategyId: z.string().min(1),
    })
    .strict(),
  'keeper-rwa-vault': z
    .object({
      action: z.enum(['deposit', 'withdraw', 'deposit_yield']),
      amount: z
        .string()
        .regex(/^(0|[1-9][0-9]*)$/, 'must be a base-10 integer string in base units')
        .max(78),
    })
    .strict(),
}

/** Form fields each keeper endpoint consumes — mirrors its schema. */
const BODY_FIELDS: Record<string, readonly string[]> = {
  'keeper-mining-report': ['hashrateTh', 'btcEarnedSats'],
  'mining-distribution-approve': ['id'],
  'mining-calculation-trigger': ['period', 'rwaStrategyId'],
  'keeper-rwa-vault': ['action', 'amount'],
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
 * Runs a Keeper action. `confirm` must be exactly "CONFIRM": an accidental
 * submission triggers no call.
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
    return { ...base, validationError: 'Endpoint not in the registry.' }
  }
  if (endpoint.category !== 'keeper') {
    return { ...base, validationError: 'This action is not a Keeper route.' }
  }

  if (parseString(form, 'confirm') !== 'CONFIRM') {
    return { ...base, validationError: 'Missing confirmation: no request was sent.' }
  }

  // The role is re-checked here, independently of whatever the UI rendered.
  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ...base, validationError: 'Administrator role required to run a Keeper action.' }
  }

  let body: unknown = {}
  const schema = SCHEMAS[endpointId]
  if (schema) {
    const numeric = new Set(['hashrateTh', 'btcEarnedSats'])
    const candidate: Record<string, unknown> = {}
    for (const field of BODY_FIELDS[endpointId] ?? []) {
      candidate[field] = numeric.has(field) ? parseNumber(form, field) : parseString(form, field)
    }
    const parsed = schema.safeParse(candidate)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')
      return { ...base, validationError: `Request invalid against the contract: ${issues}.` }
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

  // A 2xx is NOT operation success: the body carries the real status.
  return { ...base, ok: true, result: response.data ?? null, trace: response.trace }
}
