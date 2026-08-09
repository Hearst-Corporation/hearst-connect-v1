import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Conteneur pilotage dashboard.
 * Matière des cartes = `surfaceBox` (canon PASS 2) — pas un second verre.
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
 * DashCard — CARD sémantique dashboard (Rule 60).
 *
 * Ce n'est PAS une deuxième matière : même `surfaceBox` que `Panel`.
 * API utile (title/subtitle + anti-stretch) ; le parent (bento) décide la place.
 */
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
    <section data-surface="box" className={clsx(surfaceBox, 'flex flex-col', className)}>
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
