import { surfaceRaised } from '@/components/admin/surface'
import clsx from 'clsx'

/**
 * Panneau graphique — figure/figcaption Qatar (ChartSurface).
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
  /** @deprecated — la hauteur est gérée par l’enfant. */
  chartHeight?: string
}>) {
  const hasCaption = Boolean(title || description || action)

  return (
    <figure className={clsx(surfaceRaised, 'flex h-full flex-col p-6', className)}>
      {hasCaption ? (
        <figcaption className="mb-5 border-b border-zinc-950/5 pb-4 dark:border-white/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {title ? <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3> : null}
              {description ? (
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
          </div>
        </figcaption>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </figure>
  )
}
