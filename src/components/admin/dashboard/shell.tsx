import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Conteneur pilotage — surfaces via tokens (`surfaceBox` = verre console-card).
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

export function DashCard({
  children,
  className,
  title,
  subtitle,
}: Readonly<{
  children?: ReactNode
  className?: string
  title?: string
  subtitle?: string
}>) {
  return (
    <section className={clsx(surfaceBox, 'flex flex-col', className)}>
      {title !== undefined ? (
        <header className="px-5 pt-5 pb-1">
          <Subheading>{title}</Subheading>
          {subtitle !== undefined ? <Text className="mt-1">{subtitle}</Text> : null}
        </header>
      ) : null}
      {/* No flex-1: short cards end with their content instead of matching a taller neighbour. */}
      <div className="flex min-h-0 flex-col p-5">{children}</div>
    </section>
  )
}
