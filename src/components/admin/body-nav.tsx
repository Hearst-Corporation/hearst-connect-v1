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

  return (
    <nav aria-label="Sub-navigation" className="mb-8 border-b border-ink/10 dark:border-white/10">
      <Navbar className="gap-0! flex-wrap pb-0">
        <NavbarSection className="shrink-0">
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
