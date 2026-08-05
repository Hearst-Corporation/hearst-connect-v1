'use client'

import { Navbar, NavbarItem, NavbarLabel, NavbarSection } from '@/components/catalyst/navbar'
import { hrefCorpsActif, sousMenusCorps } from '@/lib/admin-nav'
import { usePathname } from 'next/navigation'

/**
 * Sous-menus horizontaux — uniquement pour la section active (Portfolio,
 * Production, Service). Les quatre destinations principales restent dans la
 * sidebar ; le compte vit dans le menu utilisateur.
 */
export function AdminBodyNav() {
  const pathname = usePathname()
  const sousMenus = sousMenusCorps(pathname)
  if (sousMenus === undefined) return null

  const actif = hrefCorpsActif(pathname)

  return (
    <nav aria-label="Sous-navigation" className="mb-8 border-b border-zinc-950/10 dark:border-white/10">
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
              <NavbarLabel>{entree.libelle}</NavbarLabel>
            </NavbarItem>
          ))}
        </NavbarSection>
      </Navbar>
    </nav>
  )
}
