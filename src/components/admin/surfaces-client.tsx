import { AdminH2 } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * Panneau latéral de détail — composant client pour les fiches dossier/client.
 */

export function AdminDetailPanel({
  open,
  onClose,
  title,
  children,
}: Readonly<{
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}>) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden="true" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4 sm:px-6">
          <AdminH2 as="h2">{title}</AdminH2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Fermer
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  )
}

export function AdminFilterBarInteractive({
  items,
  onSelect,
  ariaLabel = 'Filtres',
}: Readonly<{
  items: readonly {
    id: string
    label: string
    count?: string | null
    active?: boolean
    title?: string
  }[]
  onSelect: (id: string) => void
  ariaLabel?: string
}>) {
  return (
    <nav className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-2" aria-label={ariaLabel}>
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.title}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
                item.active
                  ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 ring-1 ring-accent-500/30'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-950 dark:hover:text-white',
              )}
            >
              {item.label}
              {item.count !== null && item.count !== undefined ? (
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{item.count}</span>
              ) : (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
