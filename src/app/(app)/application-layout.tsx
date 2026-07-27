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
import { Mark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { logout } from '@/lib/actions'
import { toggleTheme } from '@/lib/theme'
import type { Workspace } from '@/lib/data-sources'
import type { SessionUser } from '@/lib/session'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import {
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HomeIcon,
  LifebuoyIcon,
  LinkIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

function AccountDropdownMenu({ anchor }: Readonly<{ anchor: 'top start' | 'bottom end' }>) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="/dashboard/parametres">
        <UserCircleIcon />
        <DropdownLabel>Mon compte</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem onClick={() => logout()}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Se déconnecter</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

const navigation = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: HomeIcon, exact: true },
  { href: '/dashboard/acces', label: 'Journal d’accès', icon: ClipboardDocumentListIcon, exact: false },
  { href: '/dashboard/membres', label: 'Membres', icon: UsersIcon, exact: false },
  { href: '/dashboard/connexions', label: 'Connexions', icon: LinkIcon, exact: false },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Cog6ToothIcon, exact: false },
]

export function ApplicationLayout({
  user,
  workspaces,
  children,
}: Readonly<{
  user: SessionUser
  workspaces: Workspace[]
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const initials = user.name.slice(0, 2).toUpperCase()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <ThemeToggle />
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar initials={initials} className="bg-accent-600 text-white" square />
              </DropdownButton>
              <AccountDropdownMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <Mark className="size-6" />
                <SidebarLabel>Hearst Connect</SidebarLabel>
                <ChevronDownIcon />
              </DropdownButton>
              <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
                <DropdownItem href="/dashboard/parametres">
                  <Cog8ToothIcon />
                  <DropdownLabel>Paramètres de l’espace</DropdownLabel>
                </DropdownItem>
                {workspaces.length > 0 ? <DropdownDivider /> : null}
                {workspaces.map((workspace) => (
                  <DropdownItem key={workspace.id} href="/dashboard">
                    <Avatar
                      slot="icon"
                      initials={workspace.name.slice(0, 2).toUpperCase()}
                      className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    />
                    <DropdownLabel>{workspace.name}</DropdownLabel>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {navigation.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  current={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                >
                  <item.icon />
                  <SidebarLabel>{item.label}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>

            {/* Section rendue seulement si des espaces réels ont été reçus. */}
            {workspaces.length > 0 ? (
              <SidebarSection className="max-lg:hidden">
                <SidebarHeading>Espaces</SidebarHeading>
                {workspaces.map((workspace) => (
                  <SidebarItem key={workspace.id} href="/dashboard">
                    {workspace.name}
                  </SidebarItem>
                ))}
              </SidebarSection>
            ) : null}

            <SidebarSpacer />

            <SidebarSection>
              <SidebarItem onClick={toggleTheme}>
                <MoonIcon className="dark:hidden" />
                <SunIcon className="hidden dark:block" />
                <SidebarLabel>
                  <span className="dark:hidden">Thème sombre</span>
                  <span className="hidden dark:inline">Thème clair</span>
                </SidebarLabel>
              </SidebarItem>
              <SidebarItem href="mailto:connect@hearstcorporation.io">
                <LifebuoyIcon />
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials} className="size-10 bg-accent-600 text-white" square alt="" />
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
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
