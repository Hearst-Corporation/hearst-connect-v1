import { AdminDashboardPage } from '@/features/admin-dashboard/admin-dashboard-page'
import { requireSession } from '@/lib/auth'
import { loadAdminDashboard } from '@/lib/admin-dashboard/load'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Portfolio oversight · Hearst Connect' },
}
export const dynamic = 'force-dynamic'

/** Admin dashboard — backend-first portfolio read models. */
export default async function Page() {
  const session = await requireSession()
  const data = await loadAdminDashboard()
  return <AdminDashboardPage data={data} user={publicUser(session)} />
}
