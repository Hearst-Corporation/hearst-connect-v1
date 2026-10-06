'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BellIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from '@heroicons/react/16/solid'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InboxItem, InboxKind } from '@/lib/notifications/inbox'
import { refreshInbox } from './actions'

/**
 * La cloche de l'en-tête — la boîte de réception de l'admin.
 *
 * Une pastille dit combien de choses sont NOUVELLES ; le panneau les range en
 * deux temps : « To do » (ce qui attend un geste) puis « Updates » (ce qui
 * s'est passé). Chaque ligne mène là où l'on agit.
 *
 * « Lu » est un état de l'opérateur, pas du produit : il se garde dans ce
 * navigateur. Un élément traité disparaît de lui-même, puisque la liste se
 * dérive des données (une décision prise n'attend plus).
 */

const ICON: Record<InboxKind, typeof BellIcon> = {
  deposit: ArrowDownTrayIcon,
  withdrawal: ArrowUpTrayIcon,
  distribution: BanknotesIcon,
  rebalance: ArrowPathIcon,
  protocol: ArrowsRightLeftIcon,
  lockup: LockClosedIcon,
  offer: DocumentTextIcon,
  client: UserPlusIcon,
  funds: CheckCircleIcon,
  kyc: ShieldCheckIcon,
}

const SEEN_KEY = 'hc-admin-inbox-seen'
const REFRESH_MS = 60_000

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeSeen(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
  } catch {
    /* Navigation privée ou stockage bloqué : la cloche reste juste « non lue ». */
  }
}

const shortDate = (iso: string | null) =>
  iso === null ? null : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function InboxBell({ initial }: Readonly<{ initial: readonly InboxItem[] }>) {
  const [items, setItems] = useState<readonly InboxItem[]>(initial)
  const [seen, setSeen] = useState<Set<string>>(new Set())

  useEffect(() => setSeen(readSeen()), [])

  const refresh = useCallback(async () => {
    try {
      setItems(await refreshInbox())
    } catch {
      /* Hors ligne : on garde la dernière liste plutôt qu'une cloche vide. */
    }
  }, [])

  useEffect(() => {
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [refresh])

  const unseen = useMemo(() => items.filter((i) => !seen.has(i.id)), [items, seen])
  const actions = items.filter((i) => i.severity === 'action')
  const updates = items.filter((i) => i.severity === 'info')

  const markAll = () => {
    const next = new Set([...seen, ...items.map((i) => i.id)])
    setSeen(next)
    writeSeen(next)
  }
  const markOne = (id: string) => {
    const next = new Set([...seen, id])
    setSeen(next)
    writeSeen(next)
  }

  return (
    <Popover className="relative">
      <PopoverButton
        onClick={refresh}
        aria-label={`Notifications${unseen.length > 0 ? ` — ${unseen.length} new` : ''}`}
        className="relative flex size-9 items-center justify-center rounded-full text-[var(--ud-fg-2,#a9a9a9)] ring-1 ring-[var(--ud-line,rgba(255,255,255,0.07))] transition-colors hover:text-[var(--ud-fg,#f2f2f2)] focus:outline-none data-open:bg-[var(--ud-card,#212121)] data-open:text-[var(--ud-fg,#f2f2f2)]"
      >
        <BellIcon className="size-4" aria-hidden="true" />
        {unseen.length > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--hearst-green,#9eea7a)] px-1 text-[10px] font-semibold text-[var(--hearst-green-ink,#06140a)] tabular-nums">
            {unseen.length > 9 ? '9+' : unseen.length}
          </span>
        ) : null}
      </PopoverButton>

      <PopoverPanel
        anchor={{ to: 'bottom end', gap: 10 }}
        className="z-50 flex max-h-[70vh] w-[400px] flex-col overflow-hidden rounded-xl bg-[var(--ud-card,#212121)] shadow-2xl ring-1 ring-[var(--ud-line,rgba(255,255,255,0.07))]"
      >
        {({ close }) => (
          <>
            <div className="flex items-center justify-between border-b border-[var(--ud-line,rgba(255,255,255,0.07))] px-4 py-3">
              <div>
                <p className="text-[15px] font-medium text-[var(--ud-fg,#f2f2f2)]">Notifications</p>
                <p className="text-xs text-[var(--ud-fg-3,#6f6f6f)]">
                  {actions.length} to do · {updates.length} update{updates.length === 1 ? '' : 's'}
                </p>
              </div>
              {unseen.length > 0 ? (
                <button type="button" onClick={markAll} className="text-xs font-medium text-[var(--hearst-green,#9eea7a)] hover:underline">
                  Mark all as read
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--ud-fg-3,#6f6f6f)]">You’re all caught up.</p>
              ) : (
                <>
                  <Section title="To do" items={actions} seen={seen} onOpen={(id) => { markOne(id); close() }} />
                  <Section title="Updates" items={updates} seen={seen} onOpen={(id) => { markOne(id); close() }} />
                </>
              )}
            </div>

            <Link
              href="/admin/clients?view=onUs"
              onClick={() => close()}
              className="border-t border-[var(--ud-line,rgba(255,255,255,0.07))] px-4 py-3 text-center text-xs font-medium text-[var(--ud-fg-2,#a9a9a9)] hover:text-[var(--ud-fg,#f2f2f2)]"
            >
              Open everything waiting on you
            </Link>
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}

function Section({
  title,
  items,
  seen,
  onOpen,
}: Readonly<{ title: string; items: readonly InboxItem[]; seen: Set<string>; onOpen: (id: string) => void }>) {
  if (items.length === 0) return null
  return (
    <section>
      <p className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-[0.14em] text-[var(--ud-fg-3,#6f6f6f)] uppercase">{title}</p>
      <ul>
        {items.map((item) => {
          const Icon = ICON[item.kind]
          const isNew = !seen.has(item.id)
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={() => onOpen(item.id)}
                className="flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--ud-card-raised,rgba(255,255,255,0.04))]"
              >
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                    item.severity === 'action' ? 'bg-[var(--hearst-green-dim,rgba(158,234,122,0.14))] text-[var(--hearst-green,#9eea7a)]' : 'bg-[var(--ud-inset,#161616)] text-[var(--ud-fg-2,#a9a9a9)]'
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${isNew ? 'font-semibold text-[var(--ud-fg,#f2f2f2)]' : 'text-[var(--ud-fg-2,#a9a9a9)]'}`}>{item.title}</span>
                    {shortDate(item.at) ? <span className="shrink-0 text-[11px] text-[var(--ud-fg-3,#6f6f6f)]">{shortDate(item.at)}</span> : null}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--ud-fg-3,#6f6f6f)]">{item.detail}</span>
                </span>
                {isNew ? <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--hearst-green,#9eea7a)]" aria-label="New" /> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
