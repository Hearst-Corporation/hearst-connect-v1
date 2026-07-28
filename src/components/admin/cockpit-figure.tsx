import clsx from 'clsx'

/**
 * Panneau graphique — balises figure/figcaption identiques au cockpit Qatar.
 */
export function CockpitFigure({
  title,
  description,
  action,
  children,
  className,
  chartHeight = 'h-[260px]',
}: Readonly<{
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  chartHeight?: string
}>) {
  return (
    <figure
      className={clsx(
        className,
        'flex h-full flex-col rounded-xl bg-white p-6 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:shadow-none dark:ring-white/10',
      )}
    >
      <figcaption className="mb-5 border-b border-zinc-950/5 pb-4 dark:border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </figcaption>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className={clsx(chartHeight, 'w-full')}>{children}</div>
      </div>
    </figure>
  )
}
