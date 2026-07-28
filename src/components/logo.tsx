import clsx from 'clsx'

/** Glyphe seul — carré arrondi + monogramme « H » relié. */
export function Mark({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'svg'>>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props} className={clsx(className, 'shrink-0')}>
      <rect width="32" height="32" rx="8" className="fill-accent-400" />
      <path
        d="M10 9.5v13M22 9.5v13"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="dark:stroke-white"
      />
      <path d="M10 16h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="16" cy="16" r="2.75" fill="white" />
    </svg>
  )
}

/** Glyphe + wordmark. Hérite de la couleur courante pour le texte. */
export function Logo({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span {...props} className={clsx(className, 'inline-flex items-center gap-2.5')}>
      <Mark className="size-8" />
      <span className="text-base font-semibold tracking-tight whitespace-nowrap">Hearst Connect</span>
    </span>
  )
}
