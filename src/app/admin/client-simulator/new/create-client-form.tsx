'use client'

import { surfaceInset } from '@/components/admin/surface'
import {
  ActionOutcome,
  ConfirmField,
  actionFieldClass,
} from '@/components/admin/forms/admin-action-form'
import { Button } from '@/components/catalyst/button'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Callout } from '@/components/compositions'
import { createAdminUser, type CreateAdminUserOutcome } from '@/lib/backend/create-admin-user'
import clsx from 'clsx'
import { useActionState } from 'react'

const INITIAL: CreateAdminUserOutcome = {
  ok: false,
  problem: null,
  stateReason: null,
  detail: null,
  trace: null,
  validationError: null,
  createdUserId: null,
  createdEmail: null,
}

/**
 * Formulaire POST /api/v1/admin/users — fail-closed (CONFIRM requis).
 */
export function CreateClientForm({
  disabled,
  disabledReason,
}: Readonly<{ disabled: boolean; disabledReason: string | null }>) {
  const [state, action, pending] = useActionState(createAdminUser, INITIAL)

  if (disabled) {
    return (
      <Callout tone="warning" title="Creation unavailable">
        {disabledReason}
      </Callout>
    )
  }

  return (
    // Reading/form measure (D): email, password, role, and the CONFIRM literal
    // are short single-line fields — they have no business reason to stretch to
    // the full admin content-column width on large screens.
    <form action={action} className="max-w-md space-y-4">
      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Email</span>
        <input name="email" type="email" required autoComplete="off" className={actionFieldClass} />
      </label>

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Password — min. 8 characters</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={actionFieldClass}
        />
      </label>

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Role</span>
        <select name="role" required defaultValue="investor" className={actionFieldClass}>
          <option value="investor">investor — simulated client</option>
          <option value="admin">admin</option>
        </select>
      </label>

      <ConfirmField />

      <Button type="submit" disabled={pending} color="dark/neutral">
        {pending ? 'Creating…' : 'Create account'}
      </Button>

      <ActionOutcome outcome={state} />
      {state.ok ? (
        <div className="space-y-2">
          <Callout tone="success" title="Account created">
            Account created — identifier returned by the backend, never invented. Directory indexing may take a
            moment: on the client record, the “Absent from directory” message signals this delay, not a failure.
          </Callout>
          {state.createdUserId ? (
            <Text>
              <Link href={`/admin/client-simulator/${state.createdUserId}`} className="underline">
                Open the simulated client {state.createdEmail ?? state.createdUserId}
              </Link>
            </Text>
          ) : null}
          {state.detail ? (
            <pre className={clsx(surfaceInset, 'overflow-x-auto p-3 text-xs/5 text-fg')}>
              {state.detail}
            </pre>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
