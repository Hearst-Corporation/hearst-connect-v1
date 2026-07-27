import { requireSession } from '@/lib/auth'
import { fetchWorkspaces } from '@/lib/data-sources'
import { hasDisplayableValue } from '@/lib/resolved'
import { ApplicationLayout } from './application-layout'

/**
 * Garde des routes applicatives : la session est vérifiée côté serveur, avant
 * tout rendu. Sans session valide, `requireSession` redirige vers /login.
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireSession()

  // La navigation ne liste que des espaces réellement reçus. Sans source
  // branchée, la section « Espaces » de la sidebar ne s'affiche simplement pas.
  const workspaces = await fetchWorkspaces()
  const workspaceList = hasDisplayableValue(workspaces) ? workspaces.value : []

  return (
    <ApplicationLayout user={user} workspaces={workspaceList}>
      {children}
    </ApplicationLayout>
  )
}
