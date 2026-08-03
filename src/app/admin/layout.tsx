import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Administration', default: 'Hearst Connect Administration' },
}

/**
 * Server guard: no admin surface renders without a valid session.
 *
 * Every admin route now renders inside the green command center shell composed
 * within its own page, so the layout only enforces the session and passes the
 * children through untouched.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return <>{children}</>
}
