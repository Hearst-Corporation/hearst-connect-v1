import clsx from 'clsx'

/**
 * Admin typography — canonical scale.
 * Text colors: Hearst semantic `ink` / `fg` / `fg-secondary` / `fg-tertiary`.
 */

export const adminTypography = {
  display: 'text-4xl/11 font-semibold tracking-tight text-ink dark:text-fg',
  pageTitle: 'text-3xl/9 font-semibold tracking-tight text-ink sm:text-4xl/10 dark:text-fg',
  sectionTitle: 'text-xl/7 font-semibold tracking-tight text-ink dark:text-fg',
  surfaceTitle: 'text-base/6 font-semibold text-ink dark:text-fg',
  bodyLarge: 'text-base/7 text-fg-tertiary dark:text-fg-secondary',
  body: 'text-sm/6 text-fg-tertiary dark:text-fg-secondary',
  caption: 'text-xs/5 text-fg-tertiary dark:text-fg-secondary',
  label: 'text-[0.6875rem]/4 font-medium uppercase tracking-[0.08em] text-fg-tertiary dark:text-fg-secondary',
  numericHero: 'text-4xl/10 font-semibold tracking-tight text-ink tabular-nums sm:text-5xl/10 dark:text-fg',
  numericStandard: 'text-2xl/8 font-semibold tracking-tight text-ink tabular-nums dark:text-fg',
  mono: 'font-mono text-xs/5 text-fg-tertiary dark:text-fg-secondary',
} as const

type TypoProps = Readonly<{ children: React.ReactNode; className?: string }>

export function AdminSectionTitle({
  children,
  className,
  as: Tag = 'h2',
}: TypoProps & { as?: 'h2' | 'h3' }) {
  return <Tag className={clsx(adminTypography.sectionTitle, className)}>{children}</Tag>
}

export function AdminBody({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.body, className)}>{children}</p>
}

export function AdminCaption({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.caption, className)}>{children}</p>
}

export function AdminLabel({
  children,
  className,
  as: Tag = 'p',
}: TypoProps & { as?: 'p' | 'span' }) {
  return <Tag className={clsx(adminTypography.label, className)}>{children}</Tag>
}

/** Titre H1 du bandeau hero (`AdminPageHeader`) — seul h1 autorisé hors routes. */
export function AdminHeroTitle({ children, className }: TypoProps) {
  return (
    <h1 className={clsx('truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl', className)}>
      {children}
    </h1>
  )
}
