import { surfaceRaised } from '@/components/admin/surface'
import clsx from 'clsx'
import Link from 'next/link'

/**
 * A shortcut to another screen, rendered as a real surface.
 *
 * It used to be a bare `-mx-2` link with no background: placed in a grid at
 * the foot of a page, four of them read as a strip of loose text rather than
 * as four choices. A destination is a card.
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
      className={clsx(
        surfaceRaised,
        'group flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:hover:bg-zinc-800',
      )}
    >
      <Icon className="size-5 shrink-0 fill-zinc-400 dark:fill-zinc-500" data-slot="icon" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-zinc-950 dark:text-white">{title}</span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{status}</span>
      </span>
    </Link>
  )
}
