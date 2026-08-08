'use client'

import { Avatar } from '@/components/catalyst/avatar'
import {
  Dropdown,
  DropdownButton,
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
  SidebarSpacer,
} from '@/components/catalyst/sidebar'
import { SidebarLayout } from '@/components/catalyst/sidebar-layout'
import { HearstConnectLockupImage } from '@/components/logo'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { ArrowRightStartOnRectangleIcon, ChevronUpIcon } from '@heroicons/react/16/solid'

function AccountMenu({ anchor }: Readonly<{ anchor: 'top start' | 'bottom end' }>) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
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
 * User shell — same SidebarLayout geometry as admin (w-64 rail, glow, gutters,
 * radii, surfaces). No admin nav, no invented destinations, no KPI chrome.
 * Business pages will land here later from confirmed needs.
 */
export function AccountApplicationLayout({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
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
            <SidebarItem href="/account" className="lg:mb-2.5">
              <HearstConnectLockupImage className="h-8 w-auto" />
              <SidebarLabel className="sr-only">Hearst Connect</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            {/* Nav intentionally empty until real user destinations are defined. */}
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
