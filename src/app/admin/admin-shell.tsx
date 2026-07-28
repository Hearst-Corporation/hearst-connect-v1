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
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

/**
 * Coque admin — même forme que le Management Cockpit Qatar (Catalyst SidebarLayout).
 * Accent vert Hearst conservé sur le badge et les libellés KPI.
 */

type NavItem = { href: string; label: string; icon: typeof HomeIcon }

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Accueil', icon: HomeIcon },
  { href: '/admin/clients', label: 'Clients', icon: BuildingOffice2Icon },
  { href: '/admin/conformite', label: 'Conformité', icon: ShieldCheckIcon },
  { href: '/admin/operations', label: 'Opérations', icon: ArrowsRightLeftIcon },
  { href: '/admin/administration', label: 'Administration', icon: Cog6ToothIcon },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HC'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

function GlobalSearch() {
  return (
    <div className="px-2">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-950/10 dark:ring-white/10"
        title="La recherche s’activera lorsque l’annuaire des organisations sera exposé."
      >
        <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate text-zinc-500 dark:text-zinc-400">Rechercher une organisation</span>
      </div>
    </div>
  )
}

export function AdminShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()

  const sidebar = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">
            HC
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">Hearst Connect</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">Management Cockpit</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarBody>
        <GlobalSearch />
        <SidebarSection className="mt-4">
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.href} href={item.href} current={isActive(pathname, item.href)}>
              <item.icon data-slot="icon" />
              <SidebarLabel>{item.label}</SidebarLabel>
            </SidebarItem>
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
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-600 text-xs font-bold text-white">
          HC
        </span>
        <span className="text-sm font-semibold text-zinc-950 dark:text-white">Hearst Connect</span>
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem>
          <Avatar initials={initials(user.name)} alt={user.name} className="size-8 bg-accent-600 text-white" />
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
