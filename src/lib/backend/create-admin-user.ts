'use server'

import { getSession } from '@/lib/session'
import { callBackend, type CallTrace, type Problem } from './client'
import { toBackendRole } from './auth'

export type CreateAdminUserOutcome = {
  ok: boolean
  problem: Problem | null
  stateReason: string | null
  detail: string | null
  trace: CallTrace | null
  validationError: string | null
  createdUserId: string | null
  createdEmail: string | null
}

type CreateUserResponse = {
  user: { id: string; email: string; role: string }
}

const EMPTY_OUTCOME = (): CreateAdminUserOutcome => ({
  ok: false,
  problem: null,
  stateReason: null,
  detail: null,
  trace: null,
  validationError: null,
  createdUserId: null,
  createdEmail: null,
})

/**
 * POST /api/v1/admin/users — création d’un compte (admin only).
 * Exige confirm=CONFIRM et un rôle explicite — aucun envoi accidentel.
 */
export async function createAdminUser(
  _prev: CreateAdminUserOutcome | null,
  form: FormData,
): Promise<CreateAdminUserOutcome> {
  const base = EMPTY_OUTCOME()

  if (form.get('confirm') !== 'CONFIRM') {
    return { ...base, validationError: 'Missing confirmation: no request was sent.' }
  }

  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const role = String(form.get('role') ?? '')

  if (!email) {
    return { ...base, validationError: 'Email is required.' }
  }
  if (!password) {
    return { ...base, validationError: 'Password is required.' }
  }
  if (password.length < 8) {
    return { ...base, validationError: 'Password must be at least 8 characters.' }
  }
  if (role !== 'investor' && role !== 'admin') {
    return { ...base, validationError: 'Invalid role: investor or admin only.' }
  }

  const session = await getSession()
  if (!session || toBackendRole(session.role) !== 'admin') {
    return { ...base, validationError: 'Administrator role required to create an account.' }
  }

  const response = await callBackend<CreateUserResponse>('admin-users', {
    body: { email, password, role },
  })

  if (!response.ok) {
    return {
      ...base,
      problem: response.problem,
      stateReason: response.state.reason,
      trace: response.trace,
    }
  }

  const user = response.data?.user
  let detail: string | null = null
  try {
    detail = JSON.stringify(response.data)
  } catch {
    detail = 'Account created.'
  }

  return {
    ...base,
    ok: true,
    detail,
    trace: response.trace,
    createdUserId: user?.id ?? null,
    createdEmail: user?.email ?? null,
  }
}
