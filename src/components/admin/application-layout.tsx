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
import { AdminBodyNav } from '@/components/admin/body-nav'
import { HearstConnectLockupImage } from '@/components/logo'
import { logout } from '@/lib/actions'
import {
  ADMIN_NAV,
  ADMIN_SECTION_HUBS,
  estRouteCompte,
  groupeSecondaireActif,
  hrefActif,
} from '@/lib/admin-nav'
import type { SessionUser } from '@/lib/session'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import { usePathname } from 'next/navigation'

function AccountMenu({
  anchor,
  compteActif,
}: Readonly<{ anchor: 'top start' | 'bottom end'; compteActif: boolean }>) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem
        href="/admin/profile"
        aria-current={compteActif ? 'page' : undefined}
        className={compteActif ? 'font-semibold' : undefined}
      >
        <UserCircleIcon />
        <DropdownLabel>Your account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem
        onClick={() => {
          void logout()
        }}
      >
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

/**
 * Shell console — menu principal vertical à gauche, sous-menus horizontaux
 * dans le corps via `AdminBodyNav` quand la section active en porte.
 */
export function AdminApplicationLayout({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const groupeActif = groupeSecondaireActif(pathname)
  const primaireActif = hrefActif(pathname)
  const compteActif = estRouteCompte(pathname)
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
              <AccountMenu anchor="bottom end" compteActif={compteActif} />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem href="/admin" className="lg:mb-2.5">
              <HearstConnectLockupImage className="h-8 w-auto" />
              <SidebarLabel className="sr-only">Hearst Connect</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {ADMIN_NAV.map((entree) => {
                const Icone = entree.icone
                return (
                  <SidebarItem
                    key={entree.href}
                    href={entree.href}
                    current={groupeActif === undefined && primaireActif === entree.href}
                  >
                    <Icone />
                    <SidebarLabel>{entree.label}</SidebarLabel>
                  </SidebarItem>
                )
              })}
            </SidebarSection>

            <SidebarSection>
              <SidebarHeading>Sections</SidebarHeading>
              {ADMIN_SECTION_HUBS.map((hub) => {
                const Icone = hub.icone
                return (
                  <SidebarItem
                    key={hub.href}
                    href={hub.href}
                    current={groupeActif?.titre === hub.titre}
                  >
                    <Icone />
                    <SidebarLabel>{hub.label}</SidebarLabel>
                  </SidebarItem>
                )
              })}
            </SidebarSection>

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials || 'HC'} className="size-10" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-ink dark:text-fg">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-fg-tertiary dark:text-fg-secondary">
                      {user.email}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountMenu anchor="top start" compteActif={compteActif} />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      <AdminBodyNav />
      {children}
    </SidebarLayout>
  )
}
