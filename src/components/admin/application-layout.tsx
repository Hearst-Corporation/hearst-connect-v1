'use client'

import { Avatar } from '@/components/catalyst/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/catalyst/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/catalyst/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/catalyst/sidebar'
import { SidebarLayout } from '@/components/catalyst/sidebar-layout'
import { Logo } from '@/components/logo'
import { logout } from '@/lib/actions'
import {
  ADMIN_NAV,
  ADMIN_SECONDARY,
  hrefActif,
} from '@/lib/admin-nav'
import type { SessionUser } from '@/lib/session'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import { usePathname } from 'next/navigation'

function AccountMenu({ anchor }: Readonly<{ anchor: 'top start' | 'bottom end' }>) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="/admin/profile">
        <UserCircleIcon />
        <DropdownLabel>Votre compte</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem
        onClick={() => {
          void logout()
        }}
      >
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Se déconnecter</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

/**
 * Shell console — Catalyst SidebarLayout, câblé sur `ADMIN_NAV`.
 *
 * Les destinations vivent ici (module client) : les icônes Heroicons ne
 * traversent pas la frontière serveur → client.
 */
export function AdminApplicationLayout({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const current = hrefActif(pathname) ?? '/admin'
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar initials={initials || 'HC'} square alt="" />
              </DropdownButton>
              <AccountMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem href="/admin" className="lg:mb-2.5">
              <Logo className="text-zinc-950 dark:text-white" />
              <SidebarLabel className="sr-only">Hearst Connect</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {ADMIN_NAV.map((entry) => {
                const Icon = entry.icone
                return (
                  <SidebarItem key={entry.href} href={entry.href} current={current === entry.href}>
                    <Icon />
                    <SidebarLabel>{entry.libelle}</SidebarLabel>
                  </SidebarItem>
                )
              })}
            </SidebarSection>

            {ADMIN_SECONDARY.map((group) => (
              <SidebarSection key={group.titre} className="max-lg:hidden">
                <SidebarHeading>{group.titre}</SidebarHeading>
                {group.entrees.map((entry) => {
                  const Icon = entry.icone
                  const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`)
                  return (
                    <SidebarItem key={entry.href} href={entry.href} current={active}>
                      <Icon />
                      <SidebarLabel>{entry.libelle}</SidebarLabel>
                    </SidebarItem>
                  )
                })}
              </SidebarSection>
            ))}

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials || 'HC'} className="size-10" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
