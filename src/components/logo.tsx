import clsx from 'clsx'

/** Monogramme institutionnel — géométrie droite, sans cartouche décoratif. */
export function Mark({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'svg'>>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props} className={clsx(className, 'shrink-0')}>
      <path d="M4 4h6v10h12V4h6v24h-6V18H10v10H4z" fill="currentColor" />
      <rect x="13" y="14" width="6" height="4" className="fill-accent-400" />
    </svg>
  )
}

/** Glyphe + wordmark. Hérite de la couleur courante pour le texte. */
export function Logo({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span {...props} className={clsx(className, 'inline-flex items-center gap-3')}>
      <Mark className="size-8" />
      <span className="flex flex-col leading-none whitespace-nowrap">
        <span className="text-sm font-bold tracking-[0.16em]">HEARST</span>
        <span className="mt-1 text-[0.625rem] tracking-[0.24em] text-current/60">CONNECT</span>
      </span>
    </span>
  )
}
