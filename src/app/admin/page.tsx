import { AdminDashboardPage } from '@/features/admin-dashboard/admin-dashboard-page'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Portfolio oversight · Hearst Connect' },
}
export const dynamic = 'force-dynamic'

/**
 * Admin dashboard — backend-first portfolio read models.
 * The route stays thin: panels stream behind their own Suspense boundaries
 * and fetch through the cached read models in `lib/admin-dashboard`.
 */
export default async function Page() {
  const session = await requireSession()
  return <AdminDashboardPage user={publicUser(session)} />
}
