import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Dashboard control container.
 * Card material = `surfaceBox` (PASS 2 canon) — not a second glass layer.
 */
export function DashboardShell({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  // Cockpit, not editorial: no reading-measure cap — the bento tracks and
  // container queries own the geometry at every width, the shell fills the
  // content card.
  return (
    <div data-dashboard="pilotage" className={clsx('flex w-full min-w-0 flex-col gap-6', className)}>
      {children}
    </div>
  )
}

/**
 * DashCard — semantic dashboard CARD.
 *
 * Same `surfaceBox` material as `Panel`; height intrinsic to the content.
 */
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
  return (
    <section data-surface="box" className={clsx(surfaceBox, 'flex min-w-0 flex-col', className)}>
      {title !== undefined ? (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-1">
          <div className="min-w-0">
            <Subheading level={titleLevel}>{title}</Subheading>
            {subtitle !== undefined ? <Text className="mt-0.5">{subtitle}</Text> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={clsx('flex min-h-0 min-w-0 flex-col p-4', contentClassName)}>{children}</div>
    </section>
  )
}
