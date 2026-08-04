import { GreenAdminHomeDashboard } from '@/features/admin-home/admin-home-dashboard'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import type { Metadata } from 'next'

// Next.js does not apply a layout's title.template to a page sharing the same
// route segment as that layout (only to nested descendants) — so the admin
// index composes its title explicitly rather than relying on admin/layout.tsx.
export const metadata: Metadata = { title: { absolute: 'Vue d’ensemble de l’administration · Hearst Connect' } }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
  return <GreenAdminHomeDashboard registry={registry} user={publicUser(session)} />
}
