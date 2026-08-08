import { AdminDashboardPage } from '@/features/admin-dashboard/admin-dashboard-page'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Subscription oversight · Hearst Connect' },
}
export const dynamic = 'force-dynamic'

/** Dashboard admin unique — pilotage des souscriptions. */
export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
  return <AdminDashboardPage registry={registry} user={publicUser(session)} />
}
