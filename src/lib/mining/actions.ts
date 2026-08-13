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
