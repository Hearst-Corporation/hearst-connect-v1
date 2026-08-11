import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Command center · Hearst Connect' },
}

/**
 * Autonomous user shell — session guard only, no admin/account chrome.
 * The dashboard owns the full viewport with its own nav, exactly like the
 * standalone prototype it is ported from.
 */
export default async function EspaceUtilisateurLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return <>{children}</>
}
