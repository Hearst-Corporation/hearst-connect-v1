'use client'

import { SETTINGS_NAV } from '@/lib/settings/schema'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * LA BARRE DU HAUT — où l'on est, et un raccourci vers n'importe où.
 *
 * Le fil d'Ariane dit l'écran courant (« Clients › ZAND Bank ›  Rewards »).
 * ⌘K (Ctrl K) ouvre la palette : un client, une page, une action — tapées,
 * pas cherchées dans les menus. Les flèches choisissent, Entrée ouvre.
 */

export type PaletteClient = Readonly<{ id: string; label: string }>
type Item = Readonly<{ group: string; label: string; hint?: string; href: string }>

const PAGES: readonly Item[] = [
  { group: 'Go to', label: 'Dashboard', href: '/admin' },
  { group: 'Go to', label: 'Clients', href: '/admin/clients' },
  { group: 'Go to', label: 'Pipeline', hint: 'Clients', href: '/admin/clients/pipeline' },
  { group: 'Go to', label: 'Active vaults', hint: 'Clients', href: '/admin/clients/active' },
  { group: 'Go to', label: 'Settlement', href: '/admin/settlement' },
  ...SETTINGS_NAV.flatMap((g) => g.items.map((i) => ({ group: 'Settings', label: i.label, hint: g.title || 'Settings', href: i.href }))),
]
const ACTIONS: readonly Item[] = [
  { group: 'Actions', label: 'New offer', href: '/admin/offers/new' },
  { group: 'Actions', label: 'Review decisions', hint: 'Waiting on you', href: '/admin#decisions' },
  { group: 'Actions', label: 'Close the month', hint: 'Settlement', href: '/admin/settlement' },
  { group: 'Actions', label: 'Approve settings changes', href: '/admin/settings' },
  { group: 'Actions', label: 'Export the audit log', href: '/admin/settings/audit' },
]

const TAB_LABEL: Record<string, string> = {
  overview: 'Overview',
  offer: 'Offer & emails',
  rewards: 'Rewards',
  allocation: 'Allocation',
  payments: 'Payments',
  compute: 'Compute',
  kyc: 'KYC',
  activity: 'Activity',
}

const VIEW_LABEL: Record<string, string> = { waiting: 'Waiting on you', pipeline: 'Pipeline', active: 'Active', closed: 'Closed' }

function useCrumbs(clients: readonly PaletteClient[]): readonly { label: string; href?: string }[] {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean).slice(1)
  if (parts.length === 0) return [{ label: 'Dashboard' }]
  if (parts[0] === 'clients') {
    /* `/admin/clients/active` : une vue de la liste ; `/admin/clients/cli_2/vault-2/rewards` :
       la fiche, son vault, son onglet ; `/admin/clients/cli_2/new-offer` : l'offre à préparer. */
    if (parts[1] && VIEW_LABEL[parts[1]]) return [{ label: 'Clients', href: '/admin/clients' }, { label: VIEW_LABEL[parts[1]] }]
    const client = parts[1] ? clients.find((c) => c.id === parts[1]) : null
    const rest = parts.slice(2)
    const vault = rest[0]?.match(/^vault-(\d+)$/)?.[1]
    const tab = vault ? rest[1] : rest[0]
    return [
      { label: 'Clients', href: parts[1] ? '/admin/clients' : undefined },
      ...(parts[1] ? [{ label: client?.label ?? 'Client', href: rest.length ? `/admin/clients/${parts[1]}` : undefined }] : []),
      ...(vault ? [{ label: `Vault ${vault}` }] : []),
      ...(tab === 'new-offer' ? [{ label: 'New offer' }] : tab && TAB_LABEL[tab] ? [{ label: TAB_LABEL[tab] }] : []),
    ]
  }
  if (parts[0] === 'settings') {
    const item = SETTINGS_NAV.flatMap((g) => g.items).find((i) => i.href === pathname)
    return [{ label: 'Settings', href: parts.length > 1 ? '/admin/settings' : undefined }, ...(parts.length > 1 ? [{ label: item?.label ?? parts[parts.length - 1] }] : [])]
  }
  if (parts[0] === 'offers') return [{ label: 'Clients', href: '/admin/clients' }, { label: parts[1] === 'new' ? 'New offer' : 'Offer' }]
  return [{ label: parts[0].charAt(0).toUpperCase() + parts[0].slice(1) }]
}

export function TopbarNav({ clients }: Readonly<{ clients: readonly PaletteClient[] }>) {
  const crumbs = useCrumbs(clients)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      setTimeout(() => input.current?.focus(), 0)
    }
  }, [open])

  const items = useMemo(() => {
    const all: Item[] = [
      ...ACTIONS,
      ...clients.map((c) => ({ group: 'Clients', label: c.label, href: `/admin/clients/${c.id}` })),
      ...PAGES,
    ]
    const needle = q.trim().toLowerCase()
    const hits = needle === '' ? all.filter((i) => i.group !== 'Clients').concat(all.filter((i) => i.group === 'Clients').slice(0, 5)) : all.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(needle))
    return hits.slice(0, 14)
  }, [q, clients])

  const go = (item: Item | undefined) => {
    if (!item) return
    setOpen(false)
    router.push(item.href)
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        <i aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-[var(--hearst-green)]" />
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 ? <span className="text-[var(--ud-fg-3)]">›</span> : null}
            {c.href ? (
              <Link href={c.href} className="truncate text-[var(--ud-fg-2)] no-underline hover:text-[var(--ud-fg)]">
                {c.label}
              </Link>
            ) : (
              <span className={`truncate ${i === crumbs.length - 1 ? 'text-[var(--ud-fg)]' : 'text-[var(--ud-fg-2)]'}`}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto mr-4 hidden h-9 w-72 items-center gap-2 rounded-full bg-white/[0.04] px-4 text-[13px] text-[var(--ud-fg-3)] ring-1 ring-[var(--ud-line)] hover:text-[var(--ud-fg-2)] lg:flex"
      >
        Search clients, pages, actions…
        <kbd className="ml-auto rounded bg-white/10 px-1.5 text-[11px] text-[var(--ud-fg-2)]">⌘K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Command palette"
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-[#121412] ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setCursor(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setCursor((c) => Math.min(items.length - 1, c + 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setCursor((c) => Math.max(0, c - 1))
                }
                if (e.key === 'Enter') go(items[cursor])
              }}
              placeholder="Type a client, a page or an action…"
              className="h-14 w-full border-b border-white/10 bg-transparent px-5 text-[15px] text-white outline-none placeholder:text-white/40"
            />
            <ul className="max-h-[50vh] overflow-y-auto py-2">
              {items.length === 0 ? <li className="px-5 py-6 text-center text-sm text-white/50">Nothing matches.</li> : null}
              {items.map((item, i) => (
                <li key={`${item.group}:${item.href}:${item.label}`}>
                  {i === 0 || items[i - 1].group !== item.group ? (
                    <p className="px-5 pt-2 pb-1 text-[11px] tracking-[0.1em] text-white/40 uppercase">{item.group}</p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-2 text-left text-sm ${i === cursor ? 'bg-white/[0.07] text-white' : 'text-white/80'}`}
                  >
                    {item.label}
                    {item.hint ? <span className="text-xs text-white/40">{item.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-white/10 px-5 py-2 text-[11px] text-white/40">↑ ↓ to choose · Enter to open · Esc to close</p>
          </div>
        </div>
      ) : null}
    </>
  )
}
