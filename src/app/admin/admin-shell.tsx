'use client'

import { Avatar } from '@/components/catalyst/avatar'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/catalyst/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/catalyst/sidebar'
import { CockpitSidebarLayout } from '@/components/admin/cockpit-sidebar-layout'
import { ADMIN_NAV, hrefActif } from '@/lib/admin-nav'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

/**
 * Coque admin — Catalyst SidebarLayout, navigation à plat.
 * Accent vert Hearst conservé sur le badge et l'avatar (texte accent-ink :
 * du blanc sur accent-400 tomberait à 1,7:1).
 */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HC'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

export function AdminShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const actif = hrefActif(pathname)

  const sidebar = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-400 text-sm font-bold text-accent-ink">
            HC
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">Hearst Connect</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">Management Cockpit</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarBody>
        {/* Une seule liste : chaque page est à un clic, sans titre de section
            ni groupe à déplier. Le filet marque la rupture, pas un intitulé. */}
        <SidebarSection>
          {ADMIN_NAV.map((entree) => (
            <div key={entree.href}>
              {entree.separateurAvant ? (
                <hr aria-hidden="true" className="my-2 border-t border-zinc-950/5 dark:border-white/5" />
              ) : null}
              <SidebarItem href={entree.href} current={entree.href === actif}>
                <entree.icone data-slot="icon" />
                <SidebarLabel>{entree.libelle}</SidebarLabel>
              </SidebarItem>
            </div>
          ))}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <SidebarSection>
          <div className="px-2 py-1">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">rôle {user.role}</p>
          </div>
          <form action={logout}>
            <SidebarItem type="submit">
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
              <SidebarLabel>Se déconnecter</SidebarLabel>
            </SidebarItem>
          </form>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  )

  const navbar = (
    <Navbar>
      <NavbarSection>
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-400 text-xs font-bold text-accent-ink">
          HC
        </span>
        <span className="text-sm font-semibold text-zinc-950 dark:text-white">Hearst Connect</span>
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem>
          <Avatar initials={initials(user.name)} alt={user.name} className="size-8 bg-accent-400 text-accent-ink" />
        </NavbarItem>
      </NavbarSection>
    </Navbar>
  )

  return (
    <div className="cockpit-theme dark contents">
      <CockpitSidebarLayout navbar={navbar} sidebar={sidebar}>
        <div className="w-full space-y-8">{children}</div>
      </CockpitSidebarLayout>
    </div>
  )
}
