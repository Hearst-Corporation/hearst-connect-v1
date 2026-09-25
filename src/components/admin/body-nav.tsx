'use client'

import { Navbar, NavbarItem, NavbarLabel, NavbarSection } from '@/components/catalyst/navbar'
import { activeBodyHref, bodySubmenus } from '@/lib/admin-nav'
import { usePathname } from 'next/navigation'

/**
 * Horizontal submenus — rendered only when the active section carries at least
 * two destinations (`bodySubmenus` returns `undefined` otherwise, hence a
 * `null`). The primary destinations stay in the sidebar; the account lives in
 * the user menu.
 *
 * Today only the "Service" section is multi-entry: on `/admin/runtime`,
 * `/admin/api-explorer` and `/admin/keeper`, the toggle renders Service status ↔
 * API explorer ↔ Keeper actions. Single-entry sections (Portfolio,
 * Production) render nothing.
 */
export function AdminBodyNav() {
  const pathname = usePathname()
  const submenus = bodySubmenus(pathname)
  if (submenus === undefined) return null

  const active = activeBodyHref(pathname)

  /* Le sous-menu DÉFILE horizontalement plutôt que de pousser la page. Ses
     entrées sont en `shrink-0` — chacune garde sa largeur, ce qui est voulu :
     un onglet dont le libellé se coupe ne se lit plus. Mais à six entrées
     elles totalisent 720px, et sur un écran de 320px elles poussaient le
     document entier. Le défilement latéral garde les libellés entiers ET la
     page à sa largeur. */
  return (
    <nav
      aria-label="Sub-navigation"
      className="mb-8 w-full max-w-full overflow-x-auto border-b border-console-line-soft"
    >
      {/* `min-w-0` : sans lui, `flex-1` refuse de descendre sous la
            largeur du contenu, et le défilement du parent reste inopérant. */}
      <Navbar className="min-w-0 gap-0! pb-0">
        <NavbarSection className="w-max shrink-0">
          {submenus.map((entry) => (
            <NavbarItem
              key={entry.href}
              href={entry.href}
              current={active === entry.href}
              title={entry.detail}
              className="shrink-0 rounded-none px-3 py-2.5 sm:px-4"
            >
              <NavbarLabel>{entry.label}</NavbarLabel>
            </NavbarItem>
          ))}
        </NavbarSection>
      </Navbar>
    </nav>
  )
}
