import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { AdminShell } from './admin-shell'

export const metadata: Metadata = {
  title: { template: '%s · Console Hearst Connect', default: 'Console Hearst Connect' },
}

/** Garde serveur : aucune surface admin ne se rend sans session valide. */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireSession()
  return <AdminShell user={user}>{children}</AdminShell>
}
