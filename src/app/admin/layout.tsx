import { AdminApplicationLayout } from '@/components/admin/application-layout'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Administration', default: 'Hearst Connect Administration' },
}

/**
 * Garde de session + shell Catalyst (SidebarLayout).
 * Les pages admin ne composent plus leur propre rail.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  return <AdminApplicationLayout user={publicUser(session)}>{children}</AdminApplicationLayout>
}
