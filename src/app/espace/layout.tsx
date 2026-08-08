import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Account', default: 'Hearst Connect Account' },
}

/**
 * Legacy `/espace` guard — pages under this tree only redirect to `/account`.
 * Chrome lives on the canonical `/account` layout.
 */
export default async function EspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return <>{children}</>
}
