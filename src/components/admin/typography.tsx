import clsx from 'clsx'

type TypoProps = Readonly<{ children: React.ReactNode; className?: string }>

/** The label of a figure or a field: 13/20 grey. */
export function AdminLabel({
  children,
  className,
  as: Tag = 'p',
}: TypoProps & { as?: 'p' | 'span' }) {
  return <Tag className={clsx('text-[0.8125rem]/5 text-(--ds-text-subtle)', className)}>{children}</Tag>
}

/** A screen title outside `PageHeader`: 24/30, regular weight. */
export function AdminHeroTitle({
  children,
  className,
  id,
}: TypoProps & { id?: string }) {
  return (
    <h1 id={id} className={clsx('truncate text-2xl/7.5 tracking-[-0.025em] text-(--ds-text)', className)}>
      {children}
    </h1>
  )
}
