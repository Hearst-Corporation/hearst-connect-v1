import { surfaceRaised } from '@/components/admin/surface'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * Chart panel — figure/figcaption pattern.
 *
 * Two things the visual review made non-negotiable, both fixed here:
 *
 * 1. **No bordered caption inside a bordered panel.** The figcaption used to
 *    carry its own bottom rule, which drew a second frame inside the card for
 *    no information gained. Space separates the caption from the plot now,
 *    exactly like `AdminSurfaceHeader` and `CardHeader`.
 * 2. **The panel is as tall as its content.** It used to be `h-full` with a
 *    vertically centered body, so a two-row chart inflated to whatever height
 *    its tallest neighbour happened to have and floated in the middle of it.
 *    Height comes from the child — see `chartHeight()` in `lib/chart-theme`.
 */
export function CockpitFigure({
  title,
  description,
  action,
  children,
  className,
}: Readonly<{
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}>) {
  const hasCaption = Boolean(title || description || action)

  return (
    <figure className={clsx(surfaceRaised, 'p-6', className)}>
      {hasCaption ? (
        <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <AdminSurfaceTitle>{title}</AdminSurfaceTitle> : null}
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </figcaption>
      ) : null}
      <div className="min-w-0">{children}</div>
    </figure>
  )
}
