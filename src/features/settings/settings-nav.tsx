'use client'

import { SETTINGS_NAV } from '@/lib/settings/schema'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Le sous-menu de Settings, à gauche — comme Stripe : des groupes nommés, une
 * entrée par réglage, l'entrée courante en aplat. Sous 1024 px, un sélecteur.
 * Une pastille dit combien de demandes attendent sur chaque section.
 */
export function SettingsNav({ pendingBySection }: Readonly<{ pendingBySection: Readonly<Record<string, number>> }>) {
  const pathname = usePathname()
  const router = useRouter()
  const all = SETTINGS_NAV.flatMap((g) => g.items)
  const active =
    [...all].sort((a, b) => b.href.length - a.href.length).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.href ??
    '/admin/settings'
  const countOf = (href: string) => pendingBySection[href.split('/').pop() ?? ''] ?? 0

  return (
    <>
      <select
        aria-label="Settings section"
        value={active}
        onChange={(e) => router.push(e.target.value)}
        className="mb-6 h-10 w-full rounded-full bg-[var(--ud-inset)] px-4 text-sm text-fg ring-1 ring-[var(--ud-line)] lg:hidden"
      >
        {SETTINGS_NAV.map((g) => (
          <optgroup key={g.title || 'top'} label={g.title || 'Settings'}>
            {g.items.map((i) => (
              <option key={i.href} value={i.href}>
                {i.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <nav aria-label="Settings" className="sticky top-6 hidden w-56 shrink-0 flex-col gap-5 self-start lg:flex">
        {SETTINGS_NAV.map((g) => (
          <div key={g.title || 'top'} className="flex flex-col gap-0.5">
            {g.title ? <p className="mb-1 px-3 text-[11px] tracking-[0.12em] text-fg-tertiary uppercase">{g.title}</p> : null}
            {g.items.map((i) => {
              const on = i.href === active
              const n = countOf(i.href)
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm no-underline ${
                    on ? 'bg-white/[0.08] font-medium text-fg' : 'text-fg-secondary hover:bg-white/[0.04] hover:text-fg'
                  }`}
                >
                  {i.label}
                  {n > 0 ? (
                    <span className="rounded-full bg-amber-300/15 px-1.5 text-[11px] font-medium text-amber-300">{n}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </>
  )
}
