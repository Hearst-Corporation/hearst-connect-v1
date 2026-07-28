import Link from 'next/link'

/**
 * Raccourci compact — bande Qatar (icône + titre + statut).
 */
export function ShortcutRow({
  title,
  status,
  href,
  icon: Icon,
}: Readonly<{
  title: string
  status: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { 'data-slot'?: string }>
}>) {
  return (
    <Link
      href={href}
      className="group -mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-white/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:hover:bg-white/5"
    >
      <Icon className="size-4 shrink-0 fill-zinc-400 dark:fill-zinc-500" data-slot="icon" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-950 dark:text-white">{title}</span>
      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{status}</span>
    </Link>
  )
}
