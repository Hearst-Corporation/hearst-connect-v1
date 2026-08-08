'use client'

import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/catalyst/sidebar'
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  PresentationChartLineIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/20/solid'
import { logout } from '@/lib/actions'
import { csl } from './console'

/**
 * End-user space navigation rail — twin of `ConsoleRail`.
 *
 * Same Catalyst composition (`Sidebar`/`SidebarItem`), same `csl` classes, same
 * accent styling. Only destinations differ (they point to `/account/*`, not
 * `/admin/*`) and the brand subtitle reads "Account". Sign out remains an
 * ACTION (`SidebarItem type="submit"` → server action `logout`), not navigation.
 *
 * Destinations live HERE (client module): icon components are functions and
 * cannot cross the server → client boundary, so the table cannot come from props.
 */
const DESTINATIONS = [
  { href: '/account', label: 'Home', icon: Squares2X2Icon },
  { href: '/account/dashboard', label: 'Dashboard', icon: PresentationChartLineIcon },
  { href: '/account/bitcoin', label: 'Bitcoin production', icon: BoltIcon },
  { href: '/account/activity', label: 'Activity', icon: ArrowsRightLeftIcon },
  { href: '/account/profile', label: 'Profile', icon: UserCircleIcon },
] as const

export function AppRail({
  /** Current destination href. A string crosses the boundary. */
  currentHref = '/account',
  /**
   * Displayed identity comes from the SESSION, never from an invented default.
   * Both props are REQUIRED — omitting one fails compilation rather than
   * showing a false identity.
   */
  userName,
  userRole,
}: Readonly<{ currentHref?: string; userName: string; userRole: string }>) {
  const trimmed = userName.trim()
  const userInitial = trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : 'H'
  return (
    <div className={csl.rail} data-csl="rail">
      <Sidebar>
        <SidebarHeader className={csl.brandHeader}>
          <div className={csl.brandRow}>
            <div className={csl.brandMark} data-csl="brand" aria-hidden="true">
              HC
            </div>
            <div className={csl.brandText}>
              <div className={csl.brandName}>Hearst Connect</div>
              <div className={csl.brandSub}>Account</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarBody>
          <SidebarSection>
            {DESTINATIONS.map((destination) => (
              <SidebarItem
                key={destination.href}
                href={destination.href}
                current={destination.href === currentHref}
                className={csl.railItem}
              >
                <destination.icon data-slot="icon" />
                <SidebarLabel>{destination.label}</SidebarLabel>
              </SidebarItem>
            ))}
          </SidebarSection>
        </SidebarBody>

        <SidebarFooter className={csl.railFooter}>
          <div className={csl.railUser}>
            <div className={csl.avatar} aria-hidden="true">
              {userInitial}
            </div>
            <div className={csl.brandText}>
              <div className={csl.brandName}>{userName}</div>
              <div className={csl.brandSub}>Role: {userRole}</div>
            </div>
          </div>
          <SidebarSection>
            <form action={logout}>
              <SidebarItem type="submit" className={csl.railItem}>
                <ArrowRightStartOnRectangleIcon data-slot="icon" />
                <SidebarLabel>Sign out</SidebarLabel>
              </SidebarItem>
            </form>
          </SidebarSection>
        </SidebarFooter>
      </Sidebar>
    </div>
  )
}
