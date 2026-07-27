import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'
import { AdminShell } from './admin-shell'

export const metadata: Metadata = {
  title: { template: '%s · Console Hearst Connect', default: 'Console Hearst Connect' },
}

/**
 * Garde serveur : aucune surface admin ne se rend sans session valide.
 *
 * `publicUser` retire le jeton backend AVANT de franchir la frontière
 * serveur → client. La coque n'a besoin que de l'identité ; le jeton, lui, ne
 * doit apparaître ni dans les props sérialisées, ni dans le HTML rendu.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  return <AdminShell user={publicUser(session)}>{children}</AdminShell>
}
