'use server'

import { getSession } from '@/lib/session'
import { callBackend, type CallTrace, type Problem } from './client'

export type DepositOutcome = {
  ok: boolean
  problem: Problem | null
  stateReason: string | null
  trace: CallTrace | null
  /** Client-side refusal — nothing was sent to the backend. */
  validationError: string | null
  /** Amount accepted by the backend, echoed back for the confirmation message. */
  acceptedUsdc: number | null
}

const EMPTY: DepositOutcome = {
  ok: false,
  problem: null,
  stateReason: null,
  trace: null,
  validationError: null,
  acceptedUsdc: null,
}

/**
 * Parses the amount typed by a human: strips spaces and thousands separators,
 * accepts a comma as decimal mark. Returns null when nothing usable remains —
 * never a silent 0, which would send a meaningless request.
 */
function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/[\s ']/g, '').replace(',', '.')
  if (cleaned === '') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Records a subscription intent for the connected investor.
 *
 * The checks below are a courtesy to the user — they catch the obvious before
 * a round-trip. They are NOT the authority: the backend owns KYC, minimum and
 * capacity, and its refusal is final even when this form was happy. `minimum`
 * and `capacity` come from the same read the page displays, so the message the
 * user gets matches the figures under their eyes.
 */
export async function requestDeposit(
  _prev: DepositOutcome | null,
  form: FormData,
): Promise<DepositOutcome> {
  const session = await getSession()
  if (!session) {
    return { ...EMPTY, validationError: 'Session expired — sign in again to subscribe.' }
  }

  const amount = parseAmount(form.get('amountUsdc'))
  if (amount === null) {
    return { ...EMPTY, validationError: 'Enter an amount in USDC.' }
  }
  if (amount <= 0) {
    return { ...EMPTY, validationError: 'The amount must be greater than zero.' }
  }
  // Whole USDC on the wire — the same convention as `me-movements`.
  if (!Number.isInteger(amount)) {
    return { ...EMPTY, validationError: 'The amount must be a whole number of USDC.' }
  }

  const minimum = parseAmount(form.get('minimumUsdc'))
  if (minimum !== null && amount < minimum) {
    return {
      ...EMPTY,
      validationError: `Below the ${minimum.toLocaleString('en-US')} USDC minimum for this vault.`,
    }
  }

  const capacity = parseAmount(form.get('capacityUsdc'))
  if (capacity !== null && amount > capacity) {
    return {
      ...EMPTY,
      validationError: `Above the ${Math.floor(capacity).toLocaleString('en-US')} USDC still available in the vault.`,
    }
  }

  const response = await callBackend<Record<string, unknown>>('me-deposits', {
    body: { amountUsdc: amount },
  })

  if (!response.ok) {
    return {
      ...EMPTY,
      problem: response.problem,
      stateReason: response.state.reason,
      trace: response.trace,
    }
  }

  return { ...EMPTY, ok: true, acceptedUsdc: amount, trace: response.trace }
}
