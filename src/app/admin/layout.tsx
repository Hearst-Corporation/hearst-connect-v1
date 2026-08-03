import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'
import { AdminLayoutClient } from './admin-layout-client'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Administration', default: 'Hearst Connect Administration' },
}

/**
 * Server guard: no admin surface renders without a valid session.
 *
 * `publicUser` strips the backend token BEFORE crossing the server → client
 * boundary. The shell only needs the identity; the token itself must never
 * appear in serialized props or in the rendered HTML.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  return <AdminLayoutClient user={publicUser(session)}>{children}</AdminLayoutClient>
}
