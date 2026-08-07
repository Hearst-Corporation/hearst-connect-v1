import clsx from 'clsx'

/**
 * Admin typography — canonical scale.
 */

export const adminTypography = {
  display: 'text-4xl/11 font-semibold tracking-tight text-zinc-950 dark:text-white',
  pageTitle: 'text-3xl/9 font-semibold tracking-tight text-zinc-950 sm:text-4xl/10 dark:text-white',
  sectionTitle: 'text-xl/7 font-semibold tracking-tight text-zinc-950 dark:text-white',
  surfaceTitle: 'text-base/6 font-semibold text-zinc-950 dark:text-white',
  bodyLarge: 'text-base/7 text-zinc-500 dark:text-zinc-400',
  body: 'text-sm/6 text-zinc-500 dark:text-zinc-400',
  caption: 'text-xs/5 text-zinc-500 dark:text-zinc-400',
  label: 'text-[0.6875rem]/4 font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400',
  numericHero: 'text-4xl/10 font-semibold tracking-tight text-zinc-950 tabular-nums sm:text-5xl/10 dark:text-white',
  numericStandard: 'text-2xl/8 font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white',
  mono: 'font-mono text-xs/5 text-zinc-500 dark:text-zinc-400',
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
