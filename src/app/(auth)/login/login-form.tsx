'use client'

import { Button } from '@/components/catalyst/button'
import { ErrorMessage, Field, Label } from '@/components/catalyst/fieldset'
import { Heading } from '@/components/catalyst/heading'
import { Input } from '@/components/catalyst/input'
import { Strong, Text, TextLink } from '@/components/catalyst/text'
import { Logo } from '@/components/logo'
import { login, type LoginState } from '@/lib/actions'
import { useActionState } from 'react'

const initialState: LoginState = { error: null }

/**
 * Formulaire de connexion.
 *
 * Il ne détient ni jeton ni secret : il poste vers une Server Action qui parle
 * au backend et scelle le cookie de session. Le composant ne reçoit que des
 * messages destinés à l'utilisateur.
 */
export function LoginForm({
  notice = null,
  loginReady = true,
}: Readonly<{ notice?: string | null; loginReady?: boolean }>) {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="text-zinc-950 dark:text-white" />
      <div>
        <Heading>Connexion à votre espace</Heading>
        <Text className="mt-2">Utilisez l’adresse professionnelle rattachée à votre organisation.</Text>
      </div>

      {notice ? (
        <output className="block rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20">
          {notice}
        </output>
      ) : null}

      {!loginReady ? (
        <output className="block rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
          Le service d’authentification n’est pas configuré sur ce déploiement : aucune connexion n’est possible pour
          l’instant.
        </output>
      ) : null}

      <Field>
        <Label>Adresse e-mail</Label>
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
        <Label>Mot de passe</Label>
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
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>

      <Text>
        Pas encore d’accès ?{' '}
        <TextLink href="/register">
          <Strong>Demander une invitation</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
