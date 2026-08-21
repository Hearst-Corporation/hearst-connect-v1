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
  // Reading measure for the console: past ~1440px the charts and cards stop
  // stretching and the content centres in the space beside the rail. A cockpit
  // read at 2560px full-bleed is mostly whitespace and over-wide charts — the
  // bound keeps the composition dense and legible on any monitor.
  return (
    <div data-dashboard="pilotage" className={clsx('mx-auto flex w-full min-w-0 max-w-360 flex-col gap-6', className)}>
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
}>) {
  return (
    <section data-surface="box" className={clsx(surfaceBox, 'flex min-w-0 flex-col', className)}>
      {title !== undefined ? (
        <header className="px-5 pt-5 pb-1">
          <Subheading level={titleLevel}>{title}</Subheading>
          {subtitle !== undefined ? <Text className="mt-1">{subtitle}</Text> : null}
        </header>
      ) : null}
      <div className={clsx('flex min-h-0 min-w-0 flex-col p-5', contentClassName)}>{children}</div>
    </section>
  )
}
