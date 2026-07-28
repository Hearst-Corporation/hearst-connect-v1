import { surfaceSunken } from '@/components/admin/surface'
import clsx from 'clsx'

/**
 * Section numérotée — table des matières implicite du registre Qatar.
 */
export function CockpitSection({
  index,
  title,
  description,
  actions,
  children,
  className,
  id,
}: Readonly<{
  index?: string
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
}>) {
  const hasHeader = Boolean(title || actions || description)

  return (
    <section id={id} className={clsx(className, hasHeader && 'border-t border-zinc-950/10 pt-8 dark:border-white/10')}>
      {hasHeader ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-3">
              {index ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-200/80 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {index}
                </span>
              ) : null}
              {title ? <h2 className="text-base/6 font-semibold text-zinc-950 dark:text-white">{title}</h2> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">{description}</p>
          ) : null}
        </>
      ) : null}
      <div className={clsx(hasHeader && 'mt-5', surfaceSunken, 'space-y-6 p-5 sm:p-6')}>{children}</div>
    </section>
  )
}
