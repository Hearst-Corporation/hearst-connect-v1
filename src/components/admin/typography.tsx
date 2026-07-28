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
  return <div className={clsx(className, 'space-y-10')}>{children}</div>
}

/** En-tête de carte / surface — padding et filet alignés. */
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
        'flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4 sm:px-6 sm:py-5',
      )}
    >
      <div className="min-w-0">
        <AdminH3>{title}</AdminH3>
        {description ? <AdminCaption className="mt-1">{description}</AdminCaption> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
