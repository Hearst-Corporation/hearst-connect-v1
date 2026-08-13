'use server'

import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'
import { toBackendRole } from '@/lib/backend/auth'

export type ApproveOutcome = {
  ok: boolean
  error: string | null
}

/**
 * Approves a pending mining yield distribution (admin only).
 *
 * Calls the `mining-distribution-approve` keeper route with the distribution id.
 */
export async function approveDistribution(
  _prev: ApproveOutcome | null,
  formData: FormData,
): Promise<ApproveOutcome> {
  const id = formData.get('distributionId')
  if (typeof id !== 'string' || id === '') {
    return { ok: false, error: 'Distribution identifier missing.' }
  }

  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ok: false, error: 'Administrator role required.' }
  }

  const response = await callBackend<{ status: string; reason: string }>('mining-distribution-approve', {
    body: { id },
  })

  if (!response.ok) {
    return { ok: false, error: response.state.reason ?? 'Approval failed.' }
  }

  return { ok: true, error: null }
}

export type TriggerCalculationOutcome = {
  ok: boolean
  error: string | null
}

/**
 * Triggers a yield calculation for a period (admin only).
 *
 * Calls the `mining-calculation-trigger` keeper route.
 */
export async function triggerCalculation(
  _prev: TriggerCalculationOutcome | null,
  formData: FormData,
): Promise<TriggerCalculationOutcome> {
  const period = formData.get('period')
  const rwaStrategyId = formData.get('rwaStrategyId')

  if (typeof period !== 'string' || period === '') {
    return { ok: false, error: 'Period is required (YYYY-MM).' }
  }
  if (typeof rwaStrategyId !== 'string' || rwaStrategyId === '') {
    return { ok: false, error: 'RWA strategy id is required.' }
  }

  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ok: false, error: 'Administrator role required.' }
  }

  const response = await callBackend<{ status: string; reason: string }>('mining-calculation-trigger', {
    body: { period, rwaStrategyId },
  })

  if (!response.ok) {
    return { ok: false, error: response.state.reason ?? 'Calculation trigger failed.' }
  }

  return { ok: true, error: null }
}

export type PayElectricityOutcome = {
  ok: boolean
  error: string | null
}

/**
 * Records an electricity payment (admin only).
 *
 * Calls the `keeper-electricity-pay` keeper route.
 */
export async function payElectricity(
  _prev: PayElectricityOutcome | null,
  formData: FormData,
): Promise<PayElectricityOutcome> {
  const amount = formData.get('amount')
  if (typeof amount !== 'string' || amount === '') {
    return { ok: false, error: 'Amount is required.' }
  }

  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ok: false, error: 'Administrator role required.' }
  }

  const response = await callBackend<{ status: string; reason: string }>('keeper-electricity-pay', {
    body: { amount },
  })

  if (!response.ok) {
    return { ok: false, error: response.state.reason ?? 'Payment failed.' }
  }

  return { ok: true, error: null }
}
