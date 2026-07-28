import clsx from 'clsx'

/**
 * Typographie admin — échelle canonique (Satoshi Variable).
 *
 * Alignée Catalyst : text-{size}/{line-height}, mobile-first.
 *
 * H1  — titre de page (PageHeader)
 * H2  — titre de section (AdminSection)
 * H3  — titre de surface / carte / panneau
 */

export const adminTypography = {
  h1: 'text-2xl/8 font-semibold tracking-tight text-brand-foreground',
  h2: 'text-base/7 font-semibold tracking-tight text-brand-foreground sm:text-sm/6',
  h3: 'text-sm/6 font-semibold text-brand-foreground',
  body: 'text-sm/6 text-brand-muted',
  caption: 'text-xs/5 text-brand-muted',
  label: 'text-xs/5 font-medium uppercase tracking-wide text-brand-muted',
  kpiHero: 'text-4xl/10 font-semibold tracking-tight tabular-nums sm:text-5xl/10',
  kpiValue: 'text-2xl/8 font-semibold tracking-tight tabular-nums sm:text-3xl/8',
  endpoint: 'font-mono text-xs/5 text-brand-muted',
  navLabel: 'text-sm/6 font-medium text-brand-foreground',
  navHint: 'text-xs/5 text-brand-muted',
} as const

type TypoProps = Readonly<{ children: React.ReactNode; className?: string }>

export function AdminH1({ children, className }: TypoProps) {
  return <h1 className={clsx(adminTypography.h1, className)}>{children}</h1>
}

export function AdminH2({
  children,
  className,
  as: Tag = 'h2',
}: TypoProps & { as?: 'h2' | 'h3' | 'p' }) {
  return <Tag className={clsx(adminTypography.h2, className)}>{children}</Tag>
}

export function AdminH3({
  children,
  className,
  as: Tag = 'h3',
}: TypoProps & { as?: 'h2' | 'h3' | 'p' | 'dt' }) {
  return <Tag className={clsx(adminTypography.h3, className)}>{children}</Tag>
}

export function AdminBody({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.body, className)}>{children}</p>
}

export function AdminCaption({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.caption, className)}>{children}</p>
}

export function AdminLabel({ children, className }: TypoProps) {
  return <p className={clsx(adminTypography.label, className)}>{children}</p>
}

/** Conteneur page admin — espacement vertical uniforme. */
export function AdminPage({ children, className }: TypoProps) {
  return <div className={clsx(className, 'space-y-8')}>{children}</div>
}

/** En-tête de carte cockpit (figcaption Qatar). */
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
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
