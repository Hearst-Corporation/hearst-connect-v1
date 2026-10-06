'use client'

import { InboxBell } from '@/features/admin-inbox/inbox-bell'
import type { InboxItem } from '@/lib/notifications/inbox'

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
  inbox,
  children,
}: Readonly<{ user: SessionUser; inbox: readonly InboxItem[]; children: React.ReactNode }>) {
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
              <InboxBell initial={inbox} />
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
            {/* La bande de marque de /account, à l'identique : 88px de haut,
                20px de retrait, logo en h-10, et un filet en bas qui se
                raccorde à celui de la page. La console portait un logo en h-8
                dans un en-tête sans hauteur fixe, donc ni la taille ni le
                raccord ne tombaient juste. */}
            <SidebarHeader className="!mb-0 h-[88px] justify-center !border-b !border-[var(--ud-line)] !px-5 !py-0">
              <a href="/admin" className="flex items-center">
                <HearstConnectLockupImage className="h-10 w-auto" />
                <span className="sr-only">Hearst Connect</span>
              </a>
            </SidebarHeader>

            {/* Plus de champ de recherche dans le rail : /account n'en porte
                pas, et il ouvrait une grammaire d'interaction propre à la
                console au premier coup d'œil. */}
            <SidebarBody className="!px-3 !pt-[22px]">
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
        {/* La topbar de /account : 88px, filet en bas, collée aux bords — son
            trait se raccorde à celui de la bande de marque et traverse alors
            l'écran d'un seul tenant. La console n'en portait pas en desktop,
            donc le filet du rail s'arrêtait net. */}
        <header className="-mx-6 mb-6 flex h-[88px] items-center justify-between gap-4 border-b border-[var(--ud-line)] px-6 max-lg:hidden">
          <div className="flex items-center gap-2.5">
            <i
              aria-hidden="true"
              className="size-[7px] rounded-full bg-[var(--hearst-green)]"
            />
            <span className="text-[13px] text-[var(--ud-fg-2)]">Console</span>
          </div>
          {/* La pastille de /account : 30px, ronde, 11px — `NavbarAvatar`
              n'emporte aucune taille et comptait sur le contexte de la
              navbar Catalyst, absent ici : l'initiale sortait en 48px dans
              un bloc de 92x165. */}
          {/* La cloche à gauche de l'avatar, comme dans toute application :
              ce qui attend l'admin, et ce qui vient de se passer. */}
          <div className="flex items-center gap-4">
          <InboxBell initial={inbox} />
          <Dropdown>
            <DropdownButton as="button" className="flex items-center gap-2.5">
              <span className="avatar" title={user.email} aria-label={user.name}>
                {initials || 'HC'}
              </span>
              <span className="text-[13px] font-medium text-[var(--ud-fg)]">{user.name}</span>
            </DropdownButton>
            <AccountMenu anchor="bottom end" activeAccount={activeAccount} />
          </Dropdown>
          </div>
        </header>
        <AdminBodyNav />
        {children}
      </SidebarLayout>
    </ToastProvider>
  )
}
