import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

/**
 * Server guard for the design laboratory.
 *
 * ── Why this layout exists at all ─────────────────────────────────────────
 * It reproduces the protection of `src/app/admin/layout.tsx` — no surface
 * renders without a valid session — and deliberately stops there. It does NOT
 * mount `AdminShell`: the laboratory is a full-screen composition with its own
 * left rail, and nesting it under the console's sidebar layout would stack two
 * navigation shells on top of each other. That is exactly why the route lives
 * outside `/admin/**`.
 *
 * Nothing crosses to the client here. The admin layout passes `publicUser(...)`
 * to its client shell precisely to strip the backend bearer token before
 * serialization; this laboratory renders entirely on the server and passes no
 * session object at all, so the token cannot reach the browser by construction.
 */
export const metadata: Metadata = {
  title: { absolute: 'Green command center (design lab) · Hearst Connect' },
  // A laboratory is not a product surface: keep it out of any index.
  robots: { index: false, follow: false },
}

export default async function DesignLabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  return children
}
