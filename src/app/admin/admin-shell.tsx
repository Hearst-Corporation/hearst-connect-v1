'use client'

import { Mark } from '@/components/logo'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  BeakerIcon,
  BoltIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  CommandLineIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  KeyIcon,
  SignalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

/**
 * Coque de la console d'administration.
 *
 * Trois groupes, comme spécifié : Opérations, Données métier, Actions admin.
 * L'état actif ne repose pas seulement sur la couleur — il porte aussi une
 * barre latérale et `aria-current`, lisibles sans distinguer le vert.
 */

type NavItem = { href: string; label: string; icon: typeof HomeIcon }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Opérations',
    items: [
      { href: '/admin', label: 'Vue d’ensemble', icon: HomeIcon },
      { href: '/admin/runtime', label: 'Runtime', icon: SignalIcon },
      { href: '/admin/api-explorer', label: 'API Explorer', icon: CommandLineIcon },
    ],
  },
  {
    title: 'Données métier',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: ChartBarSquareIcon },
      { href: '/admin/profile', label: 'Profile', icon: IdentificationIcon },
      { href: '/admin/series-1', label: 'Series 1', icon: DocumentTextIcon },
      { href: '/admin/vault', label: 'Vault', icon: CircleStackIcon },
      { href: '/admin/mining', label: 'Mining', icon: CpuChipIcon },
      { href: '/admin/btc', label: 'BTC', icon: CurrencyDollarIcon },
      { href: '/admin/product', label: 'Product', icon: BoltIcon },
      { href: '/admin/backtest', label: 'Backtest', icon: BeakerIcon },
    ],
  },
  {
    title: 'Actions admin',
    items: [{ href: '/admin/keeper', label: 'Keeper', icon: KeyIcon }],
  },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function NavLinks({ pathname, onNavigate }: Readonly<{ pathname: string; onNavigate?: () => void }>) {
  return (
    <nav className="flex flex-1 flex-col gap-y-7 px-4 py-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-3 rounded-md border-l-2 px-2.5 py-2 text-sm transition',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent',
                      active
                        ? 'border-hearst-accent bg-white/5 font-semibold text-white'
                        : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <item.icon aria-hidden="true" className={clsx('size-5', active && 'text-hearst-accent')} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AdminShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <Mark className="size-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Hearst Connect</p>
          <p className="truncate text-xs text-zinc-500">Console d’administration</p>
        </div>
      </div>
      <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm text-white">{user.name}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
        <p className="mt-1 text-xs text-zinc-600">rôle {user.role}</p>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
          >
            <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-4" />
            Se déconnecter
          </button>
        </form>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-cockpit-deep text-zinc-200">
      {/* Barre latérale — écrans larges */}
      <div className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/10 bg-cockpit-card lg:flex">
        {sidebar}
      </div>

      {/* Tiroir — mobile */}
      <Dialog open={drawerOpen} onClose={setDrawerOpen} className="lg:hidden">
        <div className="fixed inset-0 z-40 bg-black/70" aria-hidden="true" />
        <DialogPanel className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-cockpit-card">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 rounded-md p-1 text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
          >
            <span className="sr-only">Fermer la navigation</span>
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
          {sidebar}
        </DialogPanel>
      </Dialog>

      <div className="lg:pl-64">
        {/* Barre supérieure — mobile */}
        <header className="flex items-center gap-3 border-b border-white/10 bg-cockpit-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1.5 text-zinc-300 ring-1 ring-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
          >
            <span className="sr-only">Ouvrir la navigation</span>
            <Bars3Icon aria-hidden="true" className="size-5" />
          </button>
          <Mark className="size-6" />
          <span className="text-sm font-semibold text-white">Hearst Connect</span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
