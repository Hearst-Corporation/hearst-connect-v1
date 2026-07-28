import clsx from 'clsx'

/**
 * Admin typography — canonical scale.
 *
 * text-{size}/{line-height}, mobile-first, Catalyst-aligned.
 *
 * Document order: H1 page title / H2 section title / H3 surface title / H4 subsection-in-surface.
 * `display` is an opt-in class for rare full-bleed headlines — it is not part of the routine
 * heading flow and must never be the only thing standing between two H1s on a page.
 */

export const adminTypography = {
  display: 'text-3xl/9 font-semibold tracking-tight text-zinc-950 dark:text-white',
  pageTitle: 'text-2xl/8 font-semibold tracking-tight text-zinc-950 dark:text-white',
  sectionTitle: 'text-lg/7 font-semibold tracking-tight text-zinc-950 dark:text-white',
  surfaceTitle: 'text-sm/6 font-semibold text-zinc-950 dark:text-white',
  bodyLarge: 'text-base/7 text-zinc-500 dark:text-zinc-400',
  body: 'text-sm/6 text-zinc-500 dark:text-zinc-400',
  caption: 'text-xs/5 text-zinc-500 dark:text-zinc-400',
  label: 'text-xs/5 font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
  numericHero: 'text-4xl/10 font-semibold tracking-tight text-zinc-950 tabular-nums sm:text-5xl/10 dark:text-white',
  numericStandard: 'text-2xl/8 font-semibold tracking-tight text-zinc-950 tabular-nums sm:text-3xl/8 dark:text-white',
  mono: 'font-mono text-xs/5 text-zinc-500 dark:text-zinc-400',
} as const

type TypoProps = Readonly<{ children: React.ReactNode; className?: string }>

export function AdminPageTitle({ children, className }: TypoProps) {
  return <h1 className={clsx(adminTypography.pageTitle, className)}>{children}</h1>
}

export function AdminPageDescription({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.bodyLarge, className)}>{children}</p>
}

export function AdminSectionTitle({
  children,
  className,
  as: Tag = 'h2',
}: TypoProps & { as?: 'h2' | 'h3' }) {
  return <Tag className={clsx(adminTypography.sectionTitle, className)}>{children}</Tag>
}

export function AdminSurfaceTitle({
  children,
  className,
  as: Tag = 'h3',
}: TypoProps & { as?: 'h3' | 'h4' | 'p' | 'dt' }) {
  return <Tag className={clsx(adminTypography.surfaceTitle, className)}>{children}</Tag>
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

export function AdminNumericHero({
  children,
  className,
  as: Tag = 'span',
}: TypoProps & { as?: 'span' | 'p' }) {
  return <Tag className={clsx(adminTypography.numericHero, className)}>{children}</Tag>
}

export function AdminNumericValue({
  children,
  className,
  as: Tag = 'span',
}: TypoProps & { as?: 'span' | 'p' }) {
  return <Tag className={clsx(adminTypography.numericStandard, className)}>{children}</Tag>
}

/** Admin page container — owns the page's vertical rhythm. Nothing else may add page-level space-y. */
export function AdminPage({ children, className }: TypoProps) {
  return <div className={clsx('mx-auto w-full max-w-[1600px] space-y-8', className)}>{children}</div>
}

/** Card/panel header — title, optional description, optional trailing action. */
export function AdminSurfaceHeader({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}>) {
  return (
    <div
      className={clsx(
        className,
        'mb-5 border-b border-zinc-950/5 pb-4 dark:border-white/5',
        action && 'flex flex-wrap items-start justify-between gap-3',
      )}
    >
      <div>
        <AdminSurfaceTitle>{title}</AdminSurfaceTitle>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
