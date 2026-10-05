import { panelHint, panelTitle } from '@/components/compositions/panel'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/** The column of a dashboard page: its blocks, spaced by the page gap. */
export function DashboardShell({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={clsx('flex w-full min-w-0 flex-col gap-(--ds-page-gap)', className)}>{children}</div>
  )
}

/** DashCard — a dashboard box, its height that of its content. */
export function DashCard({
  children,
  className,
  contentClassName,
  title,
  titleLevel = 3,
  subtitle,
  action,
}: Readonly<{
  children?: ReactNode
  className?: string
  contentClassName?: string
  title?: string
  // A card lives under a section's `h2` (SectionHeader) → its own title is an
  // `h3` by default, so the document keeps a real heading hierarchy instead of
  // a flat wall of sibling `h2`s.
  titleLevel?: 2 | 3
  subtitle?: string
  /** Quiet link/action on the title row — replaces the bordered footer strip. */
  action?: ReactNode
}>) {
  const Title = titleLevel === 2 ? 'h2' : 'h3'
  return (
    <section data-surface="box" className={clsx(surfaceBox, 'flex min-w-0 flex-col', className)}>
      {title !== undefined ? (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-1">
          <div className="min-w-0">
            <Title className={panelTitle}>{title}</Title>
            {subtitle !== undefined ? <p className={clsx(panelHint, 'mt-0.5')}>{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={clsx('flex min-h-0 min-w-0 flex-col p-5', contentClassName)}>{children}</div>
    </section>
  )
}
