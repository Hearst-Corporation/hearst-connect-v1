'use client'

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
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/catalyst/sidebar'
import { SidebarLayout } from '@/components/catalyst/sidebar-layout'
import { AdminBodyNav } from '@/components/admin/body-nav'
import { HeaderClientSearch } from '@/components/admin/header-client-search'
import { ToastProvider } from '@/components/admin/toast'
import { NavbarAvatar, SidebarFooterIdentity, userInitials } from '@/components/layout/user-avatar-trigger'
import { HearstConnectLockupImage } from '@/components/logo'
import { logout } from '@/lib/actions'
import {
  ADMIN_NAV,
  isAccountRoute,
  activeSecondaryGroup,
  activeHref,
} from '@/lib/admin-nav'
import type { SessionUser } from '@/lib/session'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import { WalletIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

function AccountMenu({
  anchor,
  activeAccount,
}: Readonly<{ anchor: 'top start' | 'bottom end'; activeAccount: boolean }>) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem
        href="/admin/profile"
        aria-current={activeAccount ? 'page' : undefined}
        className={activeAccount ? 'font-semibold' : undefined}
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
 * Console shell — primary vertical menu on the left, horizontal submenus
 * in the body via `AdminBodyNav` when the active section provides them.
 */
export function AdminApplicationLayout({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const activeGroup = activeSecondaryGroup(pathname)
  const activePrimary = activeHref(pathname)
  const activeAccount = isAccountRoute(pathname)
  const initials = userInitials(user.name)

  return (
    <ToastProvider>
      <SidebarLayout
        navbar={
          <Navbar>
            <NavbarSpacer />
            <NavbarSection>
              <Dropdown>
                <DropdownButton as={NavbarItem}>
                  <NavbarAvatar initials={initials} />
                </DropdownButton>
                <AccountMenu anchor="bottom end" activeAccount={activeAccount} />
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
              <div className="mb-3 px-2">
                <HeaderClientSearch />
              </div>
              {/* Une seule section : les six surfaces d'outillage qui formaient
                  les hubs « Sections » sont passées sous l'entrée Settings et
                  s'ouvrent dans son sous-menu horizontal. `activeHref` les y
                  rattache, donc ouvrir l'explorateur d'API allume bien Settings
                  au lieu de n'allumer personne. */}
              <SidebarSection>
                {ADMIN_NAV.map((entry) => {
                  const Icon = entry.icon
                  return (
                    <SidebarItem
                      key={entry.href}
                      href={entry.href}
                      current={activePrimary === entry.href}
                    >
                      <Icon />
                      <SidebarLabel>{entry.label}</SidebarLabel>
                    </SidebarItem>
                  )
                })}
              </SidebarSection>

              <SidebarSpacer />

              {/* Jump to the client-facing account view (/account uses its own
                  shell, so this link leaves the admin console). Sits at the bottom
                  of the left menu, above the identity card. */}
              <SidebarSection>
                <SidebarItem href="/account">
                  <WalletIcon />
                  <SidebarLabel>Account</SidebarLabel>
                </SidebarItem>
              </SidebarSection>
            </SidebarBody>

            <SidebarFooter className="max-lg:hidden">
              <Dropdown>
                <DropdownButton as={SidebarItem}>
                  <SidebarFooterIdentity initials={initials} name={user.name} email={user.email} />
                  <ChevronUpIcon />
                </DropdownButton>
                <AccountMenu anchor="top start" activeAccount={activeAccount} />
              </Dropdown>
            </SidebarFooter>
          </Sidebar>
        }
      >
        <AdminBodyNav />
        {children}
      </SidebarLayout>
    </ToastProvider>
  )
}
