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

export function LoginForm() {
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

      <Text>
        Pas encore d’accès ?{' '}
        <TextLink href="/register">
          <Strong>Demander une invitation</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
