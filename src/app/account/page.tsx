import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { UserDashboardView } from '@/features/user-dashboard/user-dashboard'
import { loadUserDashboard } from '@/features/user-dashboard/load'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Account' }

/**
 * Canonical user hub — session-scoped command center.
 * Backend-first: every absence is a named state. Shape from the former
 * `/espace-utilisateur` surface; path is English-canonical `/account`.
 */
export default async function AccountPage() {
  const session = await requireSession()
  const data = await loadUserDashboard()
  return <UserDashboardView data={data} user={publicUser(session)} />
}
