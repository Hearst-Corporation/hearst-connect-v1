'use client'

import { Button } from '@/components/catalyst/button'
import { ErrorMessage, Field, Label } from '@/components/catalyst/fieldset'
import { Heading } from '@/components/catalyst/heading'
import { Input } from '@/components/catalyst/input'
import { Strong, Text, TextLink } from '@/components/catalyst/text'
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
      <Logo className="text-ink dark:text-fg" />
      <div>
        <Heading>Sign in to your workspace</Heading>
        <Text className="mt-2">Use the professional email address linked to your organization.</Text>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-8">
      {notice ? (
        <output className="block rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20">
          {notice}
        </output>
      ) : null}

      {!loginReady ? (
        <output className="block rounded-lg bg-fg px-4 py-3 text-sm text-console-fill-muted ring-1 ring-ink/10 dark:bg-white/5 dark:text-fg dark:ring-white/10">
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

      <Button type="submit" className="w-full" disabled={pending || !loginReady}>
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
        <form action={quickAction} className="border-t border-ink/10 pt-6 dark:border-white/10">
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
