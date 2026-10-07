'use client'

import '@/features/user-dashboard/user-dashboard.css'
import { HearstConnectLockupImage } from '@/components/logo'
import { userInitials } from '@/components/layout/user-avatar-trigger'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import {
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  RectangleStackIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

/**
 * LA COQUE DE L'ESPACE CLIENT — le rail et la barre du haut de /account,
 * avec cinq destinations, une par usage :
 *
 *   Overview   sa réserve, ce qui vient de se passer, ce qui arrive.
 *   Vaults     un par versement : allocation, rewards, calcul, échéance.
 *   Activity   un seul registre, chaque mouvement avec son statut.
 *   Documents  relevés mensuels, rapports annuels, propositions.
 *   Settings   portefeuilles autorisés, équipe, sécurité, notifications.
 *
 * Chaque destination est une URL : on la partage, on y revient.
 */

const NAV = [
  { href: '/account', label: 'Overview', Icon: HomeIcon },
  { href: '/account/vaults', label: 'Vaults', Icon: RectangleStackIcon },
  { href: '/account/activity', label: 'Activity', Icon: ArrowsRightLeftIcon },
  { href: '/account/documents', label: 'Documents', Icon: DocumentTextIcon },
  { href: '/account/settings', label: 'Settings', Icon: Cog6ToothIcon },
] as const

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
              </nav>
              <button type="button" className="rail-menu-signout" onClick={() => void logout()}>
                <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
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
            {/* La marge de la barre du haut (`--space`) : le contenu s'aligne sur elle. */}
            <div className="flex min-w-0 flex-col gap-6 px-[var(--space)] pt-[var(--space)] pb-12">{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
