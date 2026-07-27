'use client'

import { Mark } from '@/components/logo'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

/**
 * Coque de la console d'administration.
 *
 * CINQ entrées, pas une de plus. La navigation nomme le travail de l'équipe —
 * accueil, clients, conformité, opérations, administration — et non les objets
 * du backend. Les surfaces techniques (état du service, explorateur d'API,
 * keeper) et les surfaces produit (vault, minage, bitcoin, backtest) ne sont
 * pas des destinations de premier niveau : elles vivent sous Administration ou
 * dans les onglets d'une fiche. Une entrée de navigation coûte de l'attention à
 * chaque ouverture de l'application ; douze entrées en coûtaient douze.
 *
 * L'état actif ne repose jamais sur la seule couleur : il porte aussi un filet
 * latéral et `aria-current`, lisibles sans distinguer l'or.
 */

type NavItem = { href: string; label: string; hint: string; icon: typeof HomeIcon }

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Accueil', hint: 'Ce qui vous attend', icon: HomeIcon },
  { href: '/admin/clients', label: 'Clients', hint: 'Organisations et portefeuilles', icon: BuildingOffice2Icon },
  { href: '/admin/conformite', label: 'Conformité', hint: 'Dossiers à instruire', icon: ShieldCheckIcon },
  { href: '/admin/operations', label: 'Opérations', hint: 'Mouvements et validations', icon: ArrowsRightLeftIcon },
  { href: '/admin/administration', label: 'Administration', hint: 'Équipe, traces, réglages', icon: Cog6ToothIcon },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function NavLinks({ pathname, onNavigate }: Readonly<{ pathname: string; onNavigate?: () => void }>) {
  return (
    <nav aria-label="Sections" className="flex-1 px-3 py-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex items-start gap-3 rounded-lg border-l-2 px-3 py-2.5 transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
                  active
                    ? 'border-accent-400 bg-white/[0.06] text-white'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className={clsx('mt-0.5 size-5 shrink-0', active ? 'text-accent-400' : 'text-zinc-500')}
                />
                <span className="min-w-0">
                  <span className={clsx('block text-sm', active && 'font-semibold')}>{item.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{item.hint}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Recherche globale. Elle est présente sur chaque écran parce que retrouver une
 * organisation est le geste le plus fréquent d'une équipe d'opérations, et
 * qu'aucune arborescence ne le remplace.
 *
 * Le champ est annoncé comme désactivé tant qu'aucune source client n'est
 * exposée par le backend : promettre une recherche qui ne trouve rien serait
 * pire que de ne rien promettre.
 */
function GlobalSearch() {
  return (
    <div className="px-3 pt-3">
      <div
        className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm ring-1 ring-white/10"
        title="La recherche s’activera lorsque l’annuaire des organisations sera exposé."
      >
        <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0 text-zinc-600" />
        <span className="truncate text-zinc-600">Rechercher une organisation</span>
        <kbd className="ml-auto shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-sans text-[10px] text-zinc-600">
          ⌘K
        </kbd>
      </div>
    </div>
  )
}

export function AdminShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-4">
        <Mark className="size-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Hearst Connect</p>
          <p className="truncate text-xs text-zinc-500">Console d’administration</p>
        </div>
      </div>
      <GlobalSearch />
      <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm text-white">{user.name}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
        <p className="mt-1 text-xs text-zinc-600">rôle {user.role}</p>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >
            <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-4" />
            Se déconnecter
          </button>
        </form>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-surface-page text-zinc-200">
      {/* Barre latérale — écrans larges */}
      <div className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/10 bg-surface-panel lg:flex">
        {sidebar}
      </div>

      {/* Tiroir — mobile */}
      <Dialog open={drawerOpen} onClose={setDrawerOpen} className="lg:hidden">
        <div className="fixed inset-0 z-40 bg-black/70" aria-hidden="true" />
        <DialogPanel className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-surface-panel">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 rounded-md p-1 text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >
            <span className="sr-only">Fermer la navigation</span>
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
          {sidebar}
        </DialogPanel>
      </Dialog>

      <div className="lg:pl-64">
        {/* Barre supérieure — mobile */}
        <header className="flex items-center gap-3 border-b border-white/10 bg-surface-panel px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1.5 text-zinc-300 ring-1 ring-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
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
