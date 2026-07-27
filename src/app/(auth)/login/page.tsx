import { isDevBypassAllowed } from '@/lib/auth'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion',
}

export default async function LoginPage() {
  // Une session valide n'a rien à faire sur l'écran de connexion.
  if (await getSession()) redirect('/admin')

  // Le raccourci local n'est même pas rendu en production ; la garde qui compte
  // reste celle de la Server Action.
  return <LoginForm devBypass={isDevBypassAllowed()} />
}
