'use client'

import { Navbar, NavbarItem, NavbarLabel, NavbarSection } from '@/components/catalyst/navbar'
import { hrefCorpsActif, sousMenusCorps } from '@/lib/admin-nav'
import { usePathname } from 'next/navigation'

/**
 * Sous-menus horizontaux — rendus uniquement quand la section active porte au
 * moins deux destinations (`sousMenusCorps` renvoie `undefined` sinon, d'où un
 * `null`). Les destinations principales restent dans la sidebar ; le compte vit
 * dans le menu utilisateur.
 *
 * Aujourd'hui seule la section « Service » est multi-entrée : sur `/admin/runtime`,
 * `/admin/api-explorer` et `/admin/keeper`, la bascule rend Service status ↔
 * API explorer ↔ Keeper actions. Les sections mono-entrée (Portfolio,
 * Production) n'affichent rien.
 */
export function AdminBodyNav() {
  const pathname = usePathname()
  const sousMenus = sousMenusCorps(pathname)
  if (sousMenus === undefined) return null

  const actif = hrefCorpsActif(pathname)

  return (
    <nav aria-label="Sub-navigation" className="mb-8 border-b border-zinc-950/10 dark:border-white/10">
      <Navbar className="gap-0! overflow-x-auto pb-0 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
        <NavbarSection className="shrink-0">
          {sousMenus.map((entree) => (
            <NavbarItem
              key={entree.href}
              href={entree.href}
              current={actif === entree.href}
              title={entree.detail}
              className="shrink-0 rounded-none px-3 py-2.5 sm:px-4"
            >
              <NavbarLabel>{entree.label}</NavbarLabel>
            </NavbarItem>
          ))}
        </NavbarSection>
      </Navbar>
    </nav>
  )
}
