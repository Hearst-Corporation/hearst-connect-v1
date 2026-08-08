import { AccountApplicationLayout } from '@/components/account/application-layout'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Account', default: 'Hearst Connect Account' },
}

/**
 * Session guard + empty user shell (same SidebarLayout shape as admin).
 * No business chrome here — pages fill the workspace when needs are confirmed.
 */
export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  return <AccountApplicationLayout user={publicUser(session)}>{children}</AccountApplicationLayout>
}
