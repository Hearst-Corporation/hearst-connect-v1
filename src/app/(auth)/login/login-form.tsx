'use client'

import { Button } from '@/components/catalyst/button'
import { ErrorMessage, Field, Label } from '@/components/catalyst/fieldset'
import { Heading } from '@/components/catalyst/heading'
import { Input } from '@/components/catalyst/input'
import { Strong, Text, TextLink } from '@/components/catalyst/text'
import { Logo } from '@/components/logo'
import { devLogin, login, type LoginState } from '@/lib/actions'
import { useActionState } from 'react'

const initialState: LoginState = { error: null }

export function LoginForm({ devBypass = false }: { devBypass?: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="text-zinc-950 dark:text-white" />
      <div>
        <Heading>Connexion à votre espace</Heading>
        <Text className="mt-2">Utilisez l’adresse professionnelle rattachée à votre organisation.</Text>
      </div>

      <Field>
        <Label>Adresse e-mail</Label>
        <Input type="email" name="email" autoComplete="username" required autoFocus invalid={!!state.error} />
      </Field>

      <Field>
        <Label>Mot de passe</Label>
        <Input type="password" name="password" autoComplete="current-password" required invalid={!!state.error} />
        {state.error ? <ErrorMessage>{state.error}</ErrorMessage> : null}
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>

      {devBypass ? (
        <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:ring-amber-400/20">
          <Button
            type="button"
            outline
            className="w-full"
            disabled={pending}
            onClick={() => {
              void devLogin()
            }}
          >
            Entrer sans mot de passe (local)
          </Button>
          <Text className="mt-3 text-xs/5!">
            Raccourci de développement, absent des déploiements : la Server Action refuse hors local.
          </Text>
        </div>
      ) : null}

      <Text>
        Pas encore d’accès ?{' '}
        <TextLink href="/register">
          <Strong>Demander une invitation</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
