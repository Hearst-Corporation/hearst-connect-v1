import clsx from 'clsx'

export function DescriptionList({ className, ...props }: React.ComponentPropsWithoutRef<'dl'>) {
  return (
    <dl
      {...props}
      className={clsx(
        className,
        'grid grid-cols-1 text-base/6 sm:grid-cols-[min(50%,--spacing(80))_auto] sm:text-sm/6'
      )}
    />
  )
}

export function DescriptionTerm({ className, ...props }: React.ComponentPropsWithoutRef<'dt'>) {
  return (
    <dt
      {...props}
      className={clsx(
        className,
        'col-start-1 border-t border-ink/5 pt-3 text-fg-secondary first:border-none sm:border-t sm:border-ink/5 sm:py-3 dark:border-console-line-soft sm:dark:border-console-line-soft'
      )}
    />
  )
}

export function DescriptionDetails({ className, ...props }: React.ComponentPropsWithoutRef<'dd'>) {
  return (
    <dd
      {...props}
      className={clsx(
        className,
        'pt-1 pb-3 text-ink sm:border-t sm:border-ink/5 sm:py-3 sm:nth-2:border-none dark:text-fg dark:sm:border-console-line-soft'
      )}
    />
  )
}
