'use client'

import { Logo } from '@/components/logo'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'
import { ArrowRightStartOnRectangleIcon, Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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

type NavItem = { href: string; label: string; index: string }

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Accueil', index: '01' },
  { href: '/admin/clients', label: 'Clients', index: '02' },
  { href: '/admin/conformite', label: 'Conformité', index: '03' },
  { href: '/admin/operations', label: 'Opérations', index: '04' },
  { href: '/admin/administration', label: 'Administration', index: '05' },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function NavLinks({
  pathname,
  onNavigate,
  mobile = false,
}: Readonly<{ pathname: string; onNavigate?: () => void; mobile?: boolean }>) {
  return (
    <nav aria-label="Sections principales">
      <ul
        className={clsx(
          mobile ? 'border-y border-white/20 [&>li+li]:border-t [&>li+li]:border-white/20' : 'flex items-stretch',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'group flex transition-colors duration-200',
                  mobile
                    ? 'items-baseline justify-between py-5 text-2xl'
                    : 'text-label h-14 items-center gap-2 border-b-2 px-5',
                  active
                    ? 'border-accent-400 text-white'
                    : 'border-transparent text-zinc-400 hover:border-white/40 hover:text-white',
                )}
              >
                <span
                  className={clsx(
                    'font-mono text-[0.625rem] tracking-[0.14em]',
                    active ? 'text-accent-400' : 'text-zinc-500',
                  )}
                >
                  {item.index}
                </span>
                <span>{item.label}</span>
                {mobile ? <span aria-hidden="true">↗</span> : null}
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
    <div
      aria-label="Recherche globale indisponible"
      className="text-metadata hidden min-w-64 items-center gap-2 border-b border-white/30 pb-2 text-zinc-400 xl:flex"
      title="La recherche s’activera lorsque l’annuaire des organisations sera exposé."
    >
      <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">Recherche indisponible — annuaire attendu</span>
    </div>
  )
}

export function AdminShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [drawerOpen])

  return (
    <div className="bg-surface-page min-h-dvh text-zinc-950">
      <a href="#contenu" className="bg-accent-400 fixed -top-16 left-2 z-60 px-4 py-2 text-sm text-black focus:top-2">
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 bg-black text-white">
        <div className="mx-auto flex h-19 max-w-360 items-center justify-between gap-8 px-5 sm:px-8 lg:px-[4vw]">
          <Link href="/admin" aria-label="Hearst Connect — Accueil">
            <Logo />
          </Link>
          <GlobalSearch />
          <div className="hidden items-center gap-5 lg:flex">
            <div className="text-right">
              <p className="text-label text-white">{user.name}</p>
              <p className="text-metadata text-zinc-400">{user.email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-metadata hover:border-accent-400 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-zinc-300 transition-colors hover:text-white"
              >
                <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-4" />
                Déconnexion
              </button>
            </form>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-white lg:hidden"
            aria-expanded={drawerOpen}
          >
            <span className="sr-only">Ouvrir la navigation</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="hidden border-t border-white/15 lg:block">
          <div className="mx-auto max-w-360 px-[4vw]">
            <NavLinks pathname={pathname} />
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation principale"
          className="fixed inset-0 z-50 flex flex-col bg-black px-5 py-5 text-white lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Logo />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                setDrawerOpen(false)
                menuButtonRef.current?.focus()
              }}
              className="p-2 text-white"
            >
              <span className="sr-only">Fermer la navigation</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-16">
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} mobile />
          </div>
          <div className="mt-auto border-t border-white/20 pt-5">
            <p className="text-label">{user.name}</p>
            <p className="text-metadata mt-1 text-zinc-400">{user.email}</p>
            <p className="text-metadata mt-1 text-zinc-500">Rôle : {user.role}</p>
            <form action={logout} className="mt-6">
              <button type="submit" className="text-label inline-flex items-center gap-2 border-b border-white/40 pb-1">
                <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <main id="contenu" className="mx-auto max-w-360 px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-16">
        {children}
      </main>
    </div>
  )
}
