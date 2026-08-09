import clsx from 'clsx'

/**
 * Admin typography — canonical scale (dark-only product).
 * Text colors: Hearst semantic `fg` / `fg-secondary` / `fg-tertiary`.
 * KPI / amounts use `fg` (primary foreground), never raw `text-white`.
 */

export const adminTypography = {
  display: 'text-4xl/11 font-semibold tracking-tight text-fg',
  pageTitle: 'text-3xl/9 font-semibold tracking-tight text-fg sm:text-4xl/10',
  sectionTitle: 'text-xl/7 font-semibold tracking-tight text-fg',
  surfaceTitle: 'text-base/6 font-semibold text-fg',
  bodyLarge: 'text-base/7 text-fg-secondary',
  body: 'text-sm/6 text-fg-secondary',
  caption: 'text-xs/5 text-fg-secondary',
  label: 'text-[0.6875rem]/4 font-medium uppercase tracking-[0.08em] text-fg-secondary',
  numericHero: 'text-4xl/10 font-semibold tracking-tight text-fg tabular-nums sm:text-5xl/10',
  numericStandard: 'text-2xl/8 font-semibold tracking-tight text-fg tabular-nums',
  mono: 'font-mono text-xs/5 text-fg-secondary',
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
