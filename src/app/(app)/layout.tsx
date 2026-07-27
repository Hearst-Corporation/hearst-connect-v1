import { requireSession } from '@/lib/auth'
import { workspaces } from '@/lib/demo-data'
import { ApplicationLayout } from './application-layout'

/**
 * Garde des routes applicatives : la session est vérifiée côté serveur, avant
 * tout rendu. Sans session valide, `requireSession` redirige vers /login.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession()

  return (
    <ApplicationLayout user={user} workspaces={workspaces}>
      {children}
    </ApplicationLayout>
  )
}
