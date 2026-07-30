import { GreenAdminHomeDashboard } from '@/components/design-lab/green-command-center/green-admin-home-dashboard'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'

/**
 * Green command center — visual laboratory for the administration Home screen.
 *
 * ── What this route is ────────────────────────────────────────────────────
 * A sandbox. It proves the black-and-green command center design against the
 * REAL administration Home reading, without touching `/admin` itself. It is not
 * linked from the console navigation, not linked from the public site, and not
 * indexed. `/admin` remains the product surface.
 *
 * ── Why the data comes from the same place ────────────────────────────────
 * The screen reads the registry ONCE, exactly as `/admin` does, and derives its
 * figures through the shared `estateOverview`. A design proof drawn over
 * invented numbers proves nothing about the design: the panels have to survive
 * the estate as it actually reads today, which on this deployment means several
 * of them render a named absence rather than a figure. That is the point.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
  /*
   * `publicUser` retire le jeton porteur AVANT la frontière serveur → client.
   * Le rail est un composant client : lui passer la session brute publierait le
   * jeton dans le HTML sérialisé. Même précaution que `src/app/admin/layout.tsx`.
   */
  return <GreenAdminHomeDashboard registry={registry} user={publicUser(session)} />
}
