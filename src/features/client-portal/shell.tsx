'use client'

import '@/features/user-dashboard/user-dashboard.css'
import { HearstConnectLockupImage } from '@/components/logo'
import { userInitials } from '@/components/layout/user-avatar-trigger'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { InstagramIcon, LinkedInIcon, XIcon } from '@/assets/brand/social'
import { LogoMark } from '@/components/logo'
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

/**
 * LA COQUE DE L'ESPACE CLIENT — le rail et la barre du haut de /account,
 * avec trois destinations, une par usage, et le support :
 *
 *   My Vault   l'écran qu'il ouvre, en quatre onglets : sa position, le parc
 *              et l'économie du minage, son capital et son échéance, ses
 *              mouvements (filtrés, exportables).
 *   Documents  relevés mensuels, rapports annuels, propositions.
 *   Settings   portefeuilles autorisés, équipe, sécurité, notifications.
 *
 * Chaque destination est une URL : on la partage, on y revient.
 */

const NAV = [
  { href: '/account', label: 'My Vault', Icon: HomeIcon },
  { href: '/account/documents', label: 'Documents', Icon: DocumentTextIcon },
  { href: '/account/settings', label: 'Settings', Icon: Cog6ToothIcon },
] as const

const SUPPORT = 'mailto:connect@hearstcorporation.io?subject=Hearst%20Connect%20support'

const SOCIAL_LINKS = [
  { label: 'X', href: 'https://x.com/Hearst_io', Icon: XIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/hearstio/', Icon: LinkedInIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/hearst.io/', Icon: InstagramIcon },
] as const

/* Calculée une fois au chargement du module : pas d'écart serveur / client. */
const COPYRIGHT_YEAR = new Date().getFullYear()

function SocialLinks({ className }: Readonly<{ className: string }>) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  )
}

export function AccountShell({
  user,
  clientName,
  children,
}: Readonly<{ user: SessionUser; clientName: string | null; children: React.ReactNode }>) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href))
  const initials = userInitials(user.name)

  return (
    <div className="ud-root">
      <main className="page">
        <div className="shell">
          <aside className="rail" aria-label="Account sections">
            <Link href="/account" className="rail-brand">
              <HearstConnectLockupImage className="h-10 w-auto" />
              <span className="sr-only">Overview</span>
            </Link>

            <nav className="rail-nav">
              {NAV.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rail-item no-underline${isActive(href) ? ' active' : ''}`}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
              <a className="rail-item rail-item--support no-underline" href={SUPPORT}>
                <QuestionMarkCircleIcon className="size-4" aria-hidden="true" />
                <span>Support</span>
              </a>
            </nav>

            <button
              type="button"
              className="rail-burger"
              aria-expanded={menuOpen}
              aria-controls="portal-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="rail-burger-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>

            <div className="rail-menu" id="portal-nav" hidden={!menuOpen}>
              <button type="button" className="rail-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <XMarkIcon className="size-5" aria-hidden="true" />
              </button>
              <nav className="rail-menu-nav" aria-label="Main">
                {NAV.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`rail-menu-item no-underline${isActive(href) ? ' active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
                <a className="rail-menu-item no-underline" href={SUPPORT} onClick={() => setMenuOpen(false)}>
                  <QuestionMarkCircleIcon className="size-5" aria-hidden="true" />
                  <span>Support</span>
                </a>
              </nav>
              <SocialLinks className="rail-menu-social" />
              <button type="button" className="rail-menu-signout" onClick={() => void logout()}>
                <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
            <SocialLinks className="rail-social" />
          </aside>

          <div className="content">
            <header className="topbar">
              <div className="account-state">
                <i data-signal="live" />
                <span className="sync-label">{clientName ?? 'Your account'}</span>
              </div>
              <div className="topbar-user">
                <span className="avatar" title={user.email} aria-label={user.name}>
                  {initials || 'HC'}
                </span>
                <span className="topbar-name">{user.name}</span>
                <button type="button" className="sign-out" onClick={() => void logout()}>
                  <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            </header>
            <div className="dashboard-view">{children}</div>
            <footer className="ud-footer">
              <span className="ud-footer-brand" aria-label="Hearst">
                <LogoMark className="h-9 w-auto" viewBox="12.6 11.87 129.26 142.86" />
              </span>
              <p className="ud-footer-copy">© {COPYRIGHT_YEAR} Hearst. All rights reserved.</p>
              <div className="ud-footer-links">
                <a href="mailto:connect@hearstcorporation.io?subject=Terms%20%26%20conditions">Terms &amp; conditions</a>
                <a href="mailto:connect@hearstcorporation.io?subject=Privacy%20Policy">Privacy Policy</a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
