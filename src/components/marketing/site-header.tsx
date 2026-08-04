'use client'

// Bloc officiel Tailwind Plus — Marketing / Elements / Headers
// « With call to action » (elements-headers/06), palette du projet.

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState } from 'react'

const navigation = [
  { name: 'Produit', href: '#produit' },
  { name: 'Sécurité', href: '#securite' },
  { name: 'Tarifs', href: '#tarifs' },
  { name: 'Questions', href: '#questions' },
]

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white dark:bg-zinc-900">
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between gap-x-6 p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 text-zinc-950 dark:text-white">
            <span className="sr-only">Hearst Connect</span>
            <Logo />
          </Link>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <a key={item.name} href={item.href} className="text-sm/6 font-semibold text-zinc-900 dark:text-white">
              {item.name}
            </a>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end gap-x-6">
          <ThemeToggle className="max-lg:hidden" />
          <Link href="/login" className="hidden text-sm/6 font-semibold text-zinc-900 lg:block dark:text-white">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-accent-400 px-3 py-2 text-sm font-semibold text-accent-ink shadow-xs hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-500"
          >
            Demander un accès
          </Link>
        </div>
        <div className="flex items-center gap-x-1 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-mr-1.5 -my-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-zinc-700 dark:text-zinc-400"
          >
            <span className="sr-only">Ouvrir le menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
      </nav>
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-zinc-900/10 dark:bg-zinc-900 dark:sm:ring-zinc-100/10">
          <div className="flex items-center gap-x-6">
            <Link href="/" className="-m-1.5 p-1.5 text-zinc-950 dark:text-white">
              <span className="sr-only">Hearst Connect</span>
              <Logo />
            </Link>
            <Link
              href="/register"
              className="ml-auto rounded-md bg-accent-400 px-3 py-2 text-sm font-semibold text-accent-ink shadow-xs hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-500"
            >
              Demander un accès
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-zinc-700 dark:text-zinc-400"
            >
              <span className="sr-only">Fermer le menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-zinc-500/10 dark:divide-white/10">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-white/5"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
              <div className="py-6">
                <Link
                  href="/login"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-white/5"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}
