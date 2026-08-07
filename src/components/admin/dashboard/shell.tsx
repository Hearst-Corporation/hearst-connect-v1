import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Conteneur pilotage — pas de fond gris : on reste sur le panneau Catalyst blanc.
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
    <section
      className={clsx(
        'flex flex-col rounded-xl bg-white shadow-xs ring-1 ring-zinc-950/5',
        'dark:bg-zinc-900 dark:ring-white/10',
        className,
      )}
    >
      {title !== undefined ? (
        <header className="px-5 pt-5 pb-1">
          <Subheading>{title}</Subheading>
          {subtitle !== undefined ? <Text className="mt-1">{subtitle}</Text> : null}
        </header>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  )
}
