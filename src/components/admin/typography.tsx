import { pageMaxWidth, pageSectionGap } from '@/lib/layout-tokens'
import clsx from 'clsx'

/**
 * Admin typography — canonical scale.
 *
 * The rejected version made an H1 look like an ordinary card title: page
 * title 24px, section title 18px, surface title 14px — three steps crammed
 * into a 10px range, so nothing anchored the page. The scale below opens
 * those steps up:
 *
 *   H1 page title    30 → 36px   the page anchor, unmistakable
 *   H2 section title 20px        clearly a level below, never a card title
 *   H3 surface title 16px        the title of one card
 *   body             14px        prose
 *   caption / label  12 / 11px   visibly secondary, never mistaken for a title
 *
 * `display` stays an opt-in class for rare full-bleed headlines; it is not
 * part of the routine heading flow.
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

/**
 * Admin page container — owns the readable measure and the page's vertical
 * rhythm. Nothing else may add page-level `space-y`, and nothing else may
 * declare a competing `max-w`: identical margins on every route depend on
 * this component being the only owner.
 */
export function AdminPage({ children, className }: TypoProps) {
  return <div className={clsx('w-full', pageMaxWidth, pageSectionGap, className)}>{children}</div>
}

/**
 * Card/panel header — title, optional description, optional trailing action.
 *
 * The bordered rule is gone: a bordered header inside a bordered panel was
 * one of the nested frames the visual review rejected. Space separates the
 * header from the body now.
 */
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
        'mb-4',
        action && 'flex flex-wrap items-start justify-between gap-3',
      )}
    >
      <div className="min-w-0">
        <AdminSurfaceTitle>{title}</AdminSurfaceTitle>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
