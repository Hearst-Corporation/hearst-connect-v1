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
  return (
    <div data-dashboard="pilotage" className={clsx('flex flex-col gap-6', className)}>
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
  subtitle,
}: Readonly<{
  children?: ReactNode
  className?: string
  contentClassName?: string
  title?: string
  subtitle?: string
}>) {
  return (
    <section data-surface="box" className={clsx(surfaceBox, 'flex flex-col', className)}>
      {title !== undefined ? (
        <header className="px-5 pt-5 pb-1">
          <Subheading>{title}</Subheading>
          {subtitle !== undefined ? <Text className="mt-1">{subtitle}</Text> : null}
        </header>
      ) : null}
      <div className={clsx('flex min-h-0 flex-col p-5', contentClassName)}>{children}</div>
    </section>
  )
}
