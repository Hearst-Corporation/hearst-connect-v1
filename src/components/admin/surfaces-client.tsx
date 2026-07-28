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
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-brand-border bg-brand-surface shadow-2xl"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4 sm:px-6">
          <AdminH2 as="h2">{title}</AdminH2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-brand-muted hover:text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
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
    <nav className="rounded-xl border border-brand-border/60 bg-brand-surface px-2 py-2" aria-label={ariaLabel}>
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.title}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                item.active
                  ? 'bg-brand-accent/15 text-brand-accent ring-1 ring-brand-accent/30'
                  : 'text-brand-muted hover:bg-white/[0.04] hover:text-brand-foreground',
              )}
            >
              {item.label}
              {item.count !== null && item.count !== undefined ? (
                <span className="text-xs tabular-nums text-brand-muted">{item.count}</span>
              ) : (
                <span className="text-xs text-brand-muted">—</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
