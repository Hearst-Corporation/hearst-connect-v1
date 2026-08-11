import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Command center · Hearst Connect' },
}

/**
 * Canonical user shell — session guard only.
 * The account dashboard owns the full viewport (own nav + surfaces).
 * Legacy Catalyst sidebar chrome was removed; business content lives here.
 */
export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return <>{children}</>
}
