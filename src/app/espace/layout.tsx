import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Espace Hearst Connect', default: 'Espace Hearst Connect' },
}

/**
 * Server guard for the end-user space.
 *
 * `/espace` mirrors `/admin`'s guard exactly: no user surface renders without a
 * valid session. The gate is the SAME `requireSession()` the console uses — we
 * do NOT introduce a new role nor touch the fork↔backend boundary. Today every
 * authenticated session is `OWNER` (the backend `investor` role is refused at
 * login); `/espace` is simply a calmer, owner-facing presentation over the same
 * session-tier data. Each page composes its own `ConsoleShell`, so the layout
 * only enforces the session and passes the children through untouched.
 */
export default async function EspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return <>{children}</>
}
