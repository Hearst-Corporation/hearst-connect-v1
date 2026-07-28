import clsx from 'clsx'

/**
 * Grammaire de surface — registre institutionnel Qatar / Hearst Cockpit.
 * Trois plans : raised · sunken · hero.
 */

export const surfaceRaised =
  'rounded-xl bg-white shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:shadow-none dark:ring-white/10'

export const surfaceSunken =
  'rounded-xl bg-zinc-50/80 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:ring-white/5'

export function Panel({
  className,
  inset = 'md',
  tone = 'raised',
  ...props
}: {
  inset?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'raised' | 'sunken'
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        tone === 'raised' ? surfaceRaised : surfaceSunken,
        inset === 'sm' && 'p-4',
        inset === 'md' && 'p-6',
        inset === 'lg' && 'p-8',
      )}
    />
  )
}

export function PanelHeading({ title, action }: Readonly<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-950/5 px-4 py-3 dark:border-white/5">
      <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">{title}</h2>
      {action}
    </div>
  )
}
