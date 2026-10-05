'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { ErrorMessage, Field, Label } from '@hearst/ui/catalyst/fieldset'
import { Heading } from '@hearst/ui/catalyst/heading'
import { Input } from '@hearst/ui/catalyst/input'
import { Strong, Text, TextLink } from '@hearst/ui/catalyst/text'
import { Logo } from '@/components/logo'
import { login, quickLoginOwner, type LoginState } from '@/lib/actions'
import { useActionState } from 'react'

const initialState: LoginState = { error: null }

/**
 * Sign-in form.
 *
 * Holds no token or secret: it posts to a Server Action that talks to the
 * backend and seals the session cookie. The component only receives
 * user-facing messages.
 */
export function LoginForm({
  notice = null,
  loginReady = true,
  devQuickLoginAvailable = false,
}: Readonly<{ notice?: string | null; loginReady?: boolean; devQuickLoginAvailable?: boolean }>) {
  const [state, formAction, pending] = useActionState(login, initialState)
  const [quickState, quickAction, quickPending] = useActionState(quickLoginOwner, initialState)

  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="text-(--ds-text)" />
      <div>
        <Heading>Sign in to your workspace</Heading>
        <Text className="mt-2">Use the professional email address linked to your organization.</Text>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-8">
      {notice ? (
        <output className="block rounded-lg bg-(--ds-warning)/10 px-4 py-3 text-sm text-(--ds-warning) ring-1 ring-(--ds-warning)/20">
          {notice}
        </output>
      ) : null}

      {!loginReady ? (
        <output className="block rounded-lg px-4 py-3 text-sm ring-1 bg-white/5 text-(--ds-text) ring-white/10">
          Authentication is not configured on this deployment: sign-in is not available right now.
        </output>
      ) : null}

      <Field>
        <Label>Email address</Label>
        <Input
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
          disabled={pending}
          invalid={!!state.error}
        />
      </Field>

      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={pending}
          invalid={!!state.error}
        />
        {state.error ? <ErrorMessage role="alert">{state.error}</ErrorMessage> : null}
      </Field>

      <Button type="submit" color="accent" className="w-full" disabled={pending || !loginReady}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <Text>
        No access yet?{' '}
        <TextLink href="/register">
          <Strong>Request an invitation</Strong>
        </TextLink>
      </Text>
      </form>

      {devQuickLoginAvailable ? (
        <form action={quickAction} className="border-t pt-6 border-white/10">
          <Field>
            <Button type="submit" outline className="w-full" disabled={quickPending}>
              {quickPending ? 'Signing in…' : 'Quick owner sign-in (local dev)'}
            </Button>
            {quickState.error ? (
              <ErrorMessage role="alert">{quickState.error}</ErrorMessage>
            ) : null}
          </Field>
        </form>
      ) : null}
    </div>
  )
}
