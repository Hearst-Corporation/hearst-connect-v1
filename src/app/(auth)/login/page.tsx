import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion',
}

export default async function LoginPage() {
  // Une session valide n'a rien à faire sur l'écran de connexion.
  if (await getSession()) redirect('/dashboard')

  return <LoginForm />
}
