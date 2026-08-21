import clsx from 'clsx'

/**
 * Admin typography — canonical scale (dark-only product).
 * Text colors: Hearst semantic `fg` / `fg-secondary` / `fg-tertiary`.
 * KPI / amounts use `fg` (primary foreground), never raw `text-white`.
 *
 * Only the consumed keys live here — hero and KPI sizes are composed inline
 * by `AdminHeroTitle` / `AdminHeroKpiMetrics` (their sizes are role-specific).
 */

export const adminTypography = {
  label: 'text-[0.6875rem]/4 font-medium uppercase tracking-[0.08em] text-fg-secondary',
} as const

type TypoProps = Readonly<{ children: React.ReactNode; className?: string }>

export function AdminLabel({
  children,
  className,
  as: Tag = 'p',
}: TypoProps & { as?: 'p' | 'span' }) {
  return <Tag className={clsx(adminTypography.label, className)}>{children}</Tag>
}

/** Hero banner H1 title (`AdminPageHeader`) — the only h1 allowed outside routes. */
export function AdminHeroTitle({
  children,
  className,
  id,
}: TypoProps & { id?: string }) {
  return (
    <h1
      id={id}
      className={clsx('truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl', className)}
    >
      {children}
    </h1>
  )
}
