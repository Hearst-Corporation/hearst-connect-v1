import { surfaceRaised } from '@/components/admin/surface'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * Command-post card primitives used by `ChartFrame`.
 *
 * One surface grammar for the whole console: `Card` doesn't duplicate the
 * class string, it consumes `surfaceRaised` (see `surface.tsx`). Changing
 * the raised plane is therefore a single-point change.
 */
export function Card({
  children,
  className,
  as: Tag = 'section',
}: Readonly<{ children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'nav' }>) {
  return <Tag className={clsx(className, surfaceRaised)}>{children}</Tag>
}

/**
 * A card's title block. No bottom rule: a bordered header inside a bordered
 * panel is a frame inside a frame. Space does the separating.
 */
export function CardHeader({
  title,
  hint,
  action,
}: Readonly<{ title: string; hint?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
      <div className="min-w-0 wrap-break-word">
        <AdminSurfaceTitle>{title}</AdminSurfaceTitle>
        {hint ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
