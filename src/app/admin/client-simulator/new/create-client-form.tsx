'use client'

import { surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata } from '@/components/admin/truthful'
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

const FIELD_CLASS = clsx(
  surfaceInset,
  'mt-1 w-full px-2 py-1.5 text-sm text-ink dark:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
)

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
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Email</span>
        <input name="email" type="email" required autoComplete="off" className={FIELD_CLASS} />
      </label>

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Password — min. 8 characters</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={FIELD_CLASS}
        />
      </label>

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">Role</span>
        <select name="role" required defaultValue="investor" className={FIELD_CLASS}>
          <option value="investor">investor — simulated client</option>
          <option value="admin">admin</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-fg-tertiary dark:text-fg-secondary">
          Type <span className="font-mono text-warning-400">CONFIRM</span> to send the
          request
        </span>
        <input
          name="confirm"
          type="text"
          autoComplete="off"
          placeholder="CONFIRM"
          className={`${FIELD_CLASS} font-mono sm:max-w-xs`}
        />
      </label>

      <Button type="submit" disabled={pending} color="dark/neutral">
        {pending ? 'Creating…' : 'Create account'}
      </Button>

      {state.validationError ? (
        <Text className="text-danger-400">{state.validationError}</Text>
      ) : null}
      {state.stateReason ? (
        <Text className="text-warning-400">{state.stateReason}</Text>
      ) : null}
      {state.problem ? (
        <div className="mt-2">
          <ProblemState problem={state.problem} keeper={null} />
        </div>
      ) : null}
      {state.trace ? (
        <div className="mt-2">
          <RequestMetadata trace={state.trace} />
        </div>
      ) : null}
      {state.ok ? (
        <div className="space-y-2">
          <Callout tone="success" title="Account created">
            Account created — identifiant retourné par le backend, jamais inventé. L’indexation dans l’annuaire peut
            prendre un instant : sur la fiche du client, le message « Absent de l’annuaire » signale ce délai, pas
            un échec.
          </Callout>
          {state.createdUserId ? (
            <Text>
              <Link href={`/admin/client-simulator/${state.createdUserId}`} className="underline">
                Ouvrir le simulated client {state.createdEmail ?? state.createdUserId}
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
